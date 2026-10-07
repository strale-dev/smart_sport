import { createAdminClient } from "@/lib/supabase/admin";

import type { XgPair } from "@/lib/analytics/history-window-metrics";

export type FixtureTeamIds = {
  fixtureId: string;
  providerId: number;
  homeTeamId: string;
  awayTeamId: string;
};

/**
 * Batch-load expected goals for fixtures. Keys by fixture provider_id.
 * Only includes entries where both teams have non-null expected_goals.
 */
export async function loadXgPairsByFixtureProviderIds(input: {
  fixtures: FixtureTeamIds[];
  teamUuid: string;
}): Promise<Map<number, XgPair>> {
  const map = new Map<number, XgPair>();
  if (input.fixtures.length === 0) {
    return map;
  }

  const fixtureIds = input.fixtures.map((f) => f.fixtureId);
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixture_statistics")
    .select("fixture_id, team_id, expected_goals")
    .in("fixture_id", fixtureIds);

  if (error) {
    throw new Error(`Failed to batch load xG: ${error.message}`);
  }

  const statsByFixture = new Map<
    string,
    Array<{ team_id: string; expected_goals: number | null }>
  >();
  for (const row of data ?? []) {
    const entries = statsByFixture.get(row.fixture_id) ?? [];
    entries.push({
      team_id: row.team_id,
      expected_goals:
        row.expected_goals !== null ? Number(row.expected_goals) : null,
    });
    statsByFixture.set(row.fixture_id, entries);
  }

  for (const fixture of input.fixtures) {
    const entries = statsByFixture.get(fixture.fixtureId) ?? [];
    const teamStat = entries.find((e) => e.team_id === input.teamUuid);
    const opponentStat = entries.find((e) => e.team_id !== input.teamUuid);
    if (
      teamStat?.expected_goals == null ||
      opponentStat?.expected_goals == null
    ) {
      continue;
    }
    map.set(fixture.providerId, {
      xgFor: teamStat.expected_goals,
      xgAgainst: opponentStat.expected_goals,
    });
  }

  return map;
}

/** Resolve fixture DB ids for provider ids (for point-in-time xG averages). */
export async function loadFixtureIdsForXgWindow(input: {
  teamUuid: string;
  beforeAt: string;
  sampleSize: number;
}): Promise<FixtureTeamIds[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("id, provider_id, home_team_id, away_team_id")
    .in("status", ["FT", "AET", "PEN"])
    .lt("kickoff_at", input.beforeAt)
    .not("score_home", "is", null)
    .not("score_away", "is", null)
    .or(`home_team_id.eq.${input.teamUuid},away_team_id.eq.${input.teamUuid}`)
    .order("kickoff_at", { ascending: false })
    .limit(input.sampleSize * 2);

  if (error) {
    throw new Error(`Failed to query xG fixture window: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    fixtureId: row.id,
    providerId: row.provider_id,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
  }));
}

export async function computeTeamXgAveragesFromBatch(input: {
  teamUuid: string;
  beforeAt: string;
  sampleSize: number;
}): Promise<{
  xgForAvg: number | null;
  xgAgainstAvg: number | null;
  samples: number;
}> {
  const fixtures = await loadFixtureIdsForXgWindow(input);
  const xgMap = await loadXgPairsByFixtureProviderIds({
    fixtures,
    teamUuid: input.teamUuid,
  });

  const xgForValues: number[] = [];
  const xgAgainstValues: number[] = [];

  for (const fixture of fixtures) {
    const pair = xgMap.get(fixture.providerId);
    if (!pair) {
      continue;
    }
    xgForValues.push(pair.xgFor);
    xgAgainstValues.push(pair.xgAgainst);
    if (xgForValues.length >= input.sampleSize) {
      break;
    }
  }

  if (xgForValues.length === 0) {
    return { xgForAvg: null, xgAgainstAvg: null, samples: 0 };
  }

  const average = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    xgForAvg: Number(average(xgForValues).toFixed(2)),
    xgAgainstAvg: Number(average(xgAgainstValues).toFixed(2)),
    samples: xgForValues.length,
  };
}
