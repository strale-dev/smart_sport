import {
  aggregateForm,
  collectFormResults,
  type TeamFixtureRow,
} from "@/lib/analytics/compute-form";
import {
  queryCompletedTeamFixtures,
  type CompletedTeamFixtureRow,
} from "@/lib/analytics/team-history-query";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PrematchFormSlice } from "@/types/ai";
import type { FormScope, FormSnapshot } from "@/types/domain";

export type TeamCompetitionFormSlice = {
  leagueProviderId: number;
  leagueName: string;
  matches: number;
  ppg: number | null;
  goalsFor: number;
  goalsAgainst: number;
};

export type TeamHistoricalAggregates = {
  teamProviderId: number;
  finishedSampleSize: number;
  last5All: FormSnapshot;
  last10All: FormSnapshot;
  last20All: FormSnapshot;
  last30All: FormSnapshot;
  last5Home: FormSnapshot;
  last5Away: FormSnapshot;
  last10Home: FormSnapshot;
  last10Away: FormSnapshot;
  seasonToDate: FormSnapshot | null;
  previousSeason: FormSnapshot | null;
  byCompetition: TeamCompetitionFormSlice[];
};

function toPrematchSlice(snapshot: FormSnapshot): PrematchFormSlice {
  if (snapshot.results.length === 0) {
    return null;
  }

  if (snapshot.ppg == null) {
    return null;
  }

  return {
    wins: snapshot.wins,
    draws: snapshot.draws,
    losses: snapshot.losses,
    ppg: snapshot.ppg,
    goalsFor: snapshot.goalsFor,
    goalsAgainst: snapshot.goalsAgainst,
  };
}

export { toPrematchSlice as formSnapshotToPrematchSlice };

async function getTeamUuid(teamProviderId: number): Promise<string | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("teams")
    .select("id")
    .eq("provider_id", teamProviderId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to resolve team ${teamProviderId}: ${error.message}`
    );
  }

  return data?.id ?? null;
}

function filterRowsBySeason(
  rows: CompletedTeamFixtureRow[],
  seasonYear: number
): CompletedTeamFixtureRow[] {
  return rows.filter((row) => row.season?.year === seasonYear);
}

function aggregateByCompetition(
  rows: TeamFixtureRow[],
  teamProviderId: number,
  maxCompetitions = 8
): TeamCompetitionFormSlice[] {
  const byLeague = new Map<number, { name: string; rows: TeamFixtureRow[] }>();

  for (const row of rows) {
    const leagueId = row.league?.provider_id;
    const leagueName = row.league?.name;
    if (leagueId == null || !leagueName) {
      continue;
    }

    const bucket = byLeague.get(leagueId) ?? { name: leagueName, rows: [] };
    bucket.rows.push(row);
    byLeague.set(leagueId, bucket);
  }

  return [...byLeague.entries()]
    .map(([leagueProviderId, bucket]) => {
      const results = collectFormResults(bucket.rows, teamProviderId, 20);
      const snapshot = aggregateForm(results, "ALL", results.length || 20);
      return {
        leagueProviderId,
        leagueName: bucket.name,
        matches: snapshot.results.length,
        ppg: snapshot.ppg,
        goalsFor: snapshot.goalsFor,
        goalsAgainst: snapshot.goalsAgainst,
      };
    })
    .sort((left, right) => right.matches - left.matches)
    .slice(0, maxCompetitions);
}

export async function computeTeamHistoricalAggregates(
  teamProviderId: number,
  options?: { asOf?: string; seasonYear?: number | null }
): Promise<TeamHistoricalAggregates> {
  const teamUuid = await getTeamUuid(teamProviderId);
  const empty = (matches: number, scope: FormScope) =>
    aggregateForm([], scope, matches);

  if (!teamUuid) {
    return {
      teamProviderId,
      finishedSampleSize: 0,
      last5All: empty(5, "ALL"),
      last10All: empty(10, "ALL"),
      last20All: empty(20, "ALL"),
      last30All: empty(30, "ALL"),
      last5Home: empty(5, "HOME"),
      last5Away: empty(5, "AWAY"),
      last10Home: empty(10, "HOME"),
      last10Away: empty(10, "AWAY"),
      seasonToDate: null,
      previousSeason: null,
      byCompetition: [],
    };
  }

  const beforeAt = options?.asOf ?? new Date().toISOString();
  const { rows: baseRows, validCount: finishedSampleSize } =
    await queryCompletedTeamFixtures({
      teamUuid,
      beforeAt,
      scope: "ALL",
      limit: 320,
      order: "desc",
    });

  const build = (matches: number, scope: FormScope) => {
    const scoped =
      scope === "ALL"
        ? baseRows
        : baseRows.filter((row) => {
            if (scope === "HOME") {
              return row.home_team?.provider_id === teamProviderId;
            }
            return row.away_team?.provider_id === teamProviderId;
          });
    const results = collectFormResults(scoped, teamProviderId, matches);
    return aggregateForm(results, scope, matches);
  };

  let seasonToDate: FormSnapshot | null = null;
  let previousSeason: FormSnapshot | null = null;

  const seasonYears = [
    ...new Set(
      baseRows
        .map((row) => row.season?.year)
        .filter((year): year is number => year != null)
    ),
  ].sort((a, b) => b - a);

  const targetSeason = options?.seasonYear ?? seasonYears[0];
  if (targetSeason != null) {
    const seasonRows = filterRowsBySeason(baseRows, targetSeason);
    const seasonResults = collectFormResults(
      seasonRows,
      teamProviderId,
      seasonRows.length || 38
    );
    seasonToDate = aggregateForm(
      seasonResults,
      "ALL",
      seasonResults.length || 38
    );

    const prevYear = seasonYears.find((year) => year < targetSeason);
    if (prevYear != null) {
      const prevRows = filterRowsBySeason(baseRows, prevYear);
      const prevResults = collectFormResults(
        prevRows,
        teamProviderId,
        prevRows.length || 38
      );
      previousSeason = aggregateForm(
        prevResults,
        "ALL",
        prevResults.length || 38
      );
    }
  }

  return {
    teamProviderId,
    finishedSampleSize,
    last5All: build(5, "ALL"),
    last10All: build(10, "ALL"),
    last20All: build(20, "ALL"),
    last30All: build(30, "ALL"),
    last5Home: build(5, "HOME"),
    last5Away: build(5, "AWAY"),
    last10Home: build(10, "HOME"),
    last10Away: build(10, "AWAY"),
    seasonToDate,
    previousSeason,
    byCompetition: aggregateByCompetition(baseRows, teamProviderId),
  };
}
