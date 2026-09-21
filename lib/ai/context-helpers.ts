import { createAdminClient } from "@/lib/supabase/admin";
import type { Lineup } from "@/types/domain";
import { buildDataCoverage } from "@/lib/ai/data-coverage";
import type { LineupsContextState } from "@/types/ai";

export {
  ANALYSIS_DATA_LABELS,
  buildDataCoverage,
  resolveDisplayDataQuality,
  type AnalysisDataCoverage,
} from "@/lib/ai/data-coverage";

export type TeamStandingContext = {
  rank: number | null;
  points: number | null;
  played: number | null;
  win: number | null;
  draw: number | null;
  lose: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDiff: number | null;
  form: string | null;
  homePlayed: number | null;
  homeWin: number | null;
  homeDraw: number | null;
  homeLose: number | null;
  homeGoalsFor: number | null;
  homeGoalsAgainst: number | null;
  awayPlayed: number | null;
  awayWin: number | null;
  awayDraw: number | null;
  awayLose: number | null;
  awayGoalsFor: number | null;
  awayGoalsAgainst: number | null;
};

type StandingDbRow = {
  rank: number | null;
  points: number | null;
  played: number | null;
  win: number | null;
  draw: number | null;
  lose: number | null;
  goals_for: number | null;
  goals_against: number | null;
  goal_diff: number | null;
  form: string | null;
  home_played: number | null;
  home_win: number | null;
  home_draw: number | null;
  home_lose: number | null;
  home_gf: number | null;
  home_ga: number | null;
  away_played: number | null;
  away_win: number | null;
  away_draw: number | null;
  away_lose: number | null;
  away_gf: number | null;
  away_ga: number | null;
  team: { provider_id: number } | { provider_id: number }[] | null;
};

function mapStandingRow(row: StandingDbRow): TeamStandingContext {
  return {
    rank: row.rank,
    points: row.points,
    played: row.played,
    win: row.win,
    draw: row.draw,
    lose: row.lose,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    goalDiff: row.goal_diff,
    form: row.form,
    homePlayed: row.home_played,
    homeWin: row.home_win,
    homeDraw: row.home_draw,
    homeLose: row.home_lose,
    homeGoalsFor: row.home_gf,
    homeGoalsAgainst: row.home_ga,
    awayPlayed: row.away_played,
    awayWin: row.away_win,
    awayDraw: row.away_draw,
    awayLose: row.away_lose,
    awayGoalsFor: row.away_gf,
    awayGoalsAgainst: row.away_ga,
  };
}

export async function readTeamStandingsForFixture(input: {
  leagueExternalId: number;
  seasonYear: number | null;
  homeTeamExternalId: number;
  awayTeamExternalId: number;
}): Promise<{
  home: TeamStandingContext | null;
  away: TeamStandingContext | null;
}> {
  if (input.seasonYear == null) {
    return { home: null, away: null };
  }

  const client = createAdminClient();
  const { data: league } = await client
    .from("leagues")
    .select("id")
    .eq("provider_id", input.leagueExternalId)
    .maybeSingle();

  if (!league) {
    return { home: null, away: null };
  }

  const { data: season } = await client
    .from("seasons")
    .select("id")
    .eq("league_id", league.id)
    .eq("year", input.seasonYear)
    .maybeSingle();

  if (!season) {
    return { home: null, away: null };
  }

  const { data: teams } = await client
    .from("teams")
    .select("id, provider_id")
    .in("provider_id", [input.homeTeamExternalId, input.awayTeamExternalId]);

  const teamIds = (teams ?? []).map((team) => team.id);
  if (teamIds.length === 0) {
    return { home: null, away: null };
  }

  const { data, error } = await client
    .from("standings")
    .select(
      `
      rank,
      points,
      played,
      win,
      draw,
      lose,
      goals_for,
      goals_against,
      goal_diff,
      form,
      home_played,
      home_win,
      home_draw,
      home_lose,
      home_gf,
      home_ga,
      away_played,
      away_win,
      away_draw,
      away_lose,
      away_gf,
      away_ga,
      team:teams (provider_id)
    `
    )
    .eq("league_id", league.id)
    .eq("season_id", season.id)
    .in("team_id", teamIds);

  if (error) {
    throw new Error(
      `Failed to read standings for AI context: ${error.message}`
    );
  }

  let home: TeamStandingContext | null = null;
  let away: TeamStandingContext | null = null;

  for (const row of (data ?? []) as StandingDbRow[]) {
    const team = Array.isArray(row.team) ? row.team[0] : row.team;
    const providerId = team?.provider_id;
    if (providerId === input.homeTeamExternalId) {
      home = mapStandingRow(row);
    }
    if (providerId === input.awayTeamExternalId) {
      away = mapStandingRow(row);
    }
  }

  return { home, away };
}

export type LineupTeamContext = {
  teamExternalId: number;
  formation: string | null;
  isConfirmed: boolean;
  starters: Array<{
    name: string;
    position: string | null;
    shirtNumber: number | null;
  }>;
  substitutes: Array<{
    name: string;
    position: string | null;
    shirtNumber: number | null;
  }>;
};

export function mapLineupsForContext(
  lineups: Lineup[],
  lineupsState: LineupsContextState
): LineupTeamContext[] | null {
  if (lineupsState === "MISSING" || lineups.length === 0) {
    return null;
  }

  return lineups.map((lineup) => ({
    teamExternalId: lineup.teamExternalId,
    formation: lineup.formation,
    isConfirmed: lineup.isConfirmed,
    starters: lineup.players
      .filter((player) => player.isStarting)
      .map((player) => ({
        name: player.name,
        position: player.position,
        shirtNumber: player.shirtNumber,
      })),
    substitutes: lineup.players
      .filter((player) => !player.isStarting)
      .map((player) => ({
        name: player.name,
        position: player.position,
        shirtNumber: player.shirtNumber,
      })),
  }));
}

export function compactLineupsForLiveContext(
  lineups: LineupTeamContext[] | null
): LineupTeamContext[] | null {
  if (!lineups) {
    return null;
  }

  return lineups.map((team) => ({
    ...team,
    substitutes: [],
  }));
}

export function buildDataAvailableManifest(input: {
  hasStandings: boolean;
  hasFormAll: boolean;
  hasFormHomeAway: boolean;
  hasH2h: boolean;
  lineupsState: LineupsContextState;
  hasSidelined: boolean;
  hasReferee: boolean;
  hasRound: boolean;
  hasVenue: boolean;
  modelPrediction: boolean;
  hasLiveMatchStats?: boolean;
  supportsStandings?: boolean;
}): string[] {
  const coverage = buildDataCoverage({
    supportsStandings: input.supportsStandings ?? input.hasStandings,
    hasStandings: input.hasStandings,
    hasFormAll: input.hasFormAll,
    hasFormHomeAway: input.hasFormHomeAway,
    hasH2h: input.hasH2h,
    lineupsState: input.lineupsState,
    hasSidelined: input.hasSidelined,
  });

  const categories = [...coverage.dataAvailable];

  if (input.hasReferee) {
    categories.push("Referee");
  }
  if (input.hasRound) {
    categories.push("Match round");
  }
  if (input.hasVenue) {
    categories.push("Venue");
  }
  if (input.hasLiveMatchStats) {
    categories.push("Live match statistics");
  }

  return categories;
}
