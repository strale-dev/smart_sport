import type { FormMatchResult, FormScope, FormSnapshot } from "@/types/domain";

export type TeamFixtureRow = {
  provider_id: number;
  kickoff_at: string;
  score_home: number | null;
  score_away: number | null;
  home_team: { provider_id: number; name: string } | null;
  away_team: { provider_id: number; name: string } | null;
  league: { provider_id: number; name: string } | null;
};

export function resultForTeam(
  row: TeamFixtureRow,
  teamProviderId: number
): FormMatchResult | null {
  const home = row.home_team;
  const away = row.away_team;
  if (!home || !away) {
    return null;
  }

  const isHome = home.provider_id === teamProviderId;
  const isAway = away.provider_id === teamProviderId;
  if (!isHome && !isAway) {
    return null;
  }

  const goalsFor = isHome ? row.score_home : row.score_away;
  const goalsAgainst = isHome ? row.score_away : row.score_home;
  if (goalsFor === null || goalsAgainst === null) {
    return null;
  }

  let result: "W" | "D" | "L" = "D";
  if (goalsFor > goalsAgainst) {
    result = "W";
  } else if (goalsFor < goalsAgainst) {
    result = "L";
  }

  return {
    fixtureExternalId: row.provider_id,
    opponentName: isHome ? away.name : home.name,
    kickoffAt: row.kickoff_at,
    result,
    goalsFor,
    goalsAgainst,
    isHome,
  };
}

export function aggregateForm(
  results: FormMatchResult[],
  scope: FormScope,
  requestedMatches: number
): FormSnapshot {
  const wins = results.filter((entry) => entry.result === "W").length;
  const draws = results.filter((entry) => entry.result === "D").length;
  const losses = results.filter((entry) => entry.result === "L").length;
  const goalsFor = results.reduce((sum, entry) => sum + entry.goalsFor, 0);
  const goalsAgainst = results.reduce(
    (sum, entry) => sum + entry.goalsAgainst,
    0
  );
  const cleanSheets = results.filter(
    (entry) => entry.goalsAgainst === 0
  ).length;
  const points = wins * 3 + draws;
  const ppg =
    results.length > 0 ? Number((points / results.length).toFixed(2)) : null;

  return {
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    cleanSheets,
    ppg,
    matches: requestedMatches,
    scope,
    results,
  };
}

export function collectFormResults(
  rows: TeamFixtureRow[],
  teamProviderId: number,
  limit: number
): FormMatchResult[] {
  const results: FormMatchResult[] = [];

  for (const row of rows) {
    const entry = resultForTeam(row, teamProviderId);
    if (!entry) {
      continue;
    }
    results.push(entry);
    if (results.length >= limit) {
      break;
    }
  }

  return results;
}
