import type { TeamFixtureRow } from "@/lib/analytics/compute-form";
import {
  H2H_EFFECTIVE_MEETING_CAP,
  type FixtureH2HFeatures,
} from "@/lib/analytics/history-feature-types";
import {
  halfLifeForWindow,
  metricFromValue,
  normalizeWeights,
  weightForKickoff,
  weightedMean,
  weightedRate,
} from "@/lib/analytics/recency-weight";
import { TERMINAL_FIXTURE_STATUSES } from "@/lib/analytics/team-history-query";
import { createAdminClient } from "@/lib/supabase/admin";

export type BuildFixtureH2HFeaturesInput = {
  homeTeamProviderId: number;
  awayTeamProviderId: number;
  homeTeamUuid: string;
  awayTeamUuid: string;
  beforeAt: string;
  windowSize?: number;
  scope?: "ALL" | "SAME_COMP";
  leagueUuid?: string | null;
};

async function queryH2HRowsPit(input: {
  homeTeamUuid: string;
  awayTeamUuid: string;
  beforeAt: string;
  windowSize: number;
  leagueUuid?: string | null;
}): Promise<TeamFixtureRow[]> {
  const client = createAdminClient();
  let query = client
    .from("fixtures")
    .select(
      `
      provider_id,
      kickoff_at,
      score_home,
      score_away,
      home_team_id,
      away_team_id,
      home_team:teams!fixtures_home_team_id_fkey (provider_id, name),
      away_team:teams!fixtures_away_team_id_fkey (provider_id, name),
      league:leagues (provider_id, name)
    `
    )
    .in("status", [...TERMINAL_FIXTURE_STATUSES])
    .lt("kickoff_at", input.beforeAt)
    .not("score_home", "is", null)
    .not("score_away", "is", null)
    .or(
      `and(home_team_id.eq.${input.homeTeamUuid},away_team_id.eq.${input.awayTeamUuid}),and(home_team_id.eq.${input.awayTeamUuid},away_team_id.eq.${input.homeTeamUuid})`
    )
    .order("kickoff_at", { ascending: false })
    .limit(input.windowSize);

  if (input.leagueUuid) {
    query = query.eq("league_id", input.leagueUuid);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to query PIT H2H: ${error.message}`);
  }

  return (data ?? []) as TeamFixtureRow[];
}

export async function buildFixtureH2HFeatures(
  input: BuildFixtureH2HFeaturesInput
): Promise<FixtureH2HFeatures> {
  const windowSize = input.windowSize ?? 10;
  const scope = input.scope ?? "ALL";
  const leagueUuid = scope === "SAME_COMP" ? (input.leagueUuid ?? null) : null;

  const rows = await queryH2HRowsPit({
    homeTeamUuid: input.homeTeamUuid,
    awayTeamUuid: input.awayTeamUuid,
    beforeAt: input.beforeAt,
    windowSize,
    leagueUuid,
  });

  if (rows.length === 0) {
    return {
      beforeAt: input.beforeAt,
      homeTeamProviderId: input.homeTeamProviderId,
      awayTeamProviderId: input.awayTeamProviderId,
      scope,
      meetingsTotal: 0,
      meetingsInWindow: 0,
      effectiveMeetingWeight: 0,
      homeWins: 0,
      draws: 0,
      awayWins: 0,
      recencyWeightedHomeWinRate: metricFromValue(null, 0, "no_h2h"),
      recencyWeightedAvgGoals: metricFromValue(null, 0, "no_h2h"),
      avgGoalsSimple: metricFromValue(null, 0, "no_h2h"),
      venueHomeWinRateAtHome: metricFromValue(null, 0, "no_h2h"),
      dataState: "unavailable",
    };
  }

  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let totalGoals = 0;

  const halfLife = halfLifeForWindow(10);
  const rawWeights: number[] = [];
  const homeWinSamples: Array<{ hit: boolean; weight: number }> = [];
  const goalSamples: Array<{ value: number; weight: number }> = [];
  const homeVenueWinSamples: Array<{ hit: boolean; weight: number }> = [];

  for (const row of rows) {
    const home = row.home_team;
    const away = row.away_team;
    if (!home || !away || row.score_home == null || row.score_away == null) {
      continue;
    }

    const w = weightForKickoff({
      kickoffAt: row.kickoff_at,
      beforeAt: input.beforeAt,
      halfLifeDays: halfLife,
    });
    rawWeights.push(w);

    const homeIsFixtureHome = home.provider_id === input.homeTeamProviderId;
    const homeGoals = row.score_home;
    const awayGoals = row.score_away;
    const fixtureHomeGoals = homeGoals;
    const fixtureAwayGoals = awayGoals;

    let homePerspectiveWin = false;
    if (fixtureHomeGoals > fixtureAwayGoals) {
      if (homeIsFixtureHome) {
        homeWins += 1;
        homePerspectiveWin = true;
      } else {
        awayWins += 1;
      }
    } else if (fixtureHomeGoals < fixtureAwayGoals) {
      if (homeIsFixtureHome) {
        awayWins += 1;
      } else {
        homeWins += 1;
        homePerspectiveWin = true;
      }
    } else {
      draws += 1;
    }

    const goals = homeGoals + awayGoals;
    totalGoals += goals;

    homeWinSamples.push({ hit: homePerspectiveWin, weight: w });
    goalSamples.push({ value: goals, weight: w });

    const meetingAtHomeVenue = home.provider_id === input.homeTeamProviderId;
    if (meetingAtHomeVenue) {
      homeVenueWinSamples.push({
        hit: fixtureHomeGoals > fixtureAwayGoals,
        weight: w,
      });
    }
  }

  const cappedWeights = normalizeWeights(rawWeights, H2H_EFFECTIVE_MEETING_CAP);
  const effectiveMeetingWeight = cappedWeights.reduce((s, w) => s + w, 0);

  const scaledHomeWinSamples = homeWinSamples.map((s, i) => ({
    hit: s.hit,
    weight: cappedWeights[i] ?? 0,
  }));
  const scaledGoalSamples = goalSamples.map((s, i) => ({
    value: s.value,
    weight: cappedWeights[i] ?? 0,
  }));
  const scaledVenueSamples = homeVenueWinSamples.map((s) => s);

  const n = rows.length;
  const avgGoalsSimple = n > 0 ? totalGoals / n : null;

  return {
    beforeAt: input.beforeAt,
    homeTeamProviderId: input.homeTeamProviderId,
    awayTeamProviderId: input.awayTeamProviderId,
    scope,
    meetingsTotal: n,
    meetingsInWindow: n,
    effectiveMeetingWeight,
    homeWins,
    draws,
    awayWins,
    recencyWeightedHomeWinRate: metricFromValue(
      weightedRate(scaledHomeWinSamples),
      n
    ),
    recencyWeightedAvgGoals: metricFromValue(
      weightedMean(scaledGoalSamples),
      n
    ),
    avgGoalsSimple: metricFromValue(avgGoalsSimple, n),
    venueHomeWinRateAtHome: metricFromValue(
      weightedRate(scaledVenueSamples),
      homeVenueWinSamples.length
    ),
    dataState: "available",
  };
}
