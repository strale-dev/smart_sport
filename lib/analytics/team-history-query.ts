import type { TeamFixtureRow } from "@/lib/analytics/compute-form";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormScope } from "@/types/domain";

export const TERMINAL_FIXTURE_STATUSES = ["FT", "AET", "PEN"] as const;

export const TEAM_HISTORY_MIN_MATCHES = 30;
export const TEAM_HISTORY_TARGET_MATCHES = 100;
export const TEAM_HISTORY_PARTIAL_THRESHOLD = 10;

export type TeamHistoryDataState =
  "DATA_COMPLETE" | "DATA_PARTIAL" | "DATA_INSUFFICIENT";

export type TeamHistoryScope = FormScope;

export type CompletedTeamFixtureRow = TeamFixtureRow & {
  season?: { year: number } | null;
};

export type TeamHistoryCompleteness = {
  scope: TeamHistoryScope;
  validCount: number;
  state: TeamHistoryDataState;
};

export type QueryCompletedTeamFixturesInput = {
  teamUuid: string;
  beforeAt: string;
  scope?: TeamHistoryScope;
  limit?: number;
  leagueProviderIds?: number[];
  order?: "asc" | "desc";
  /** Over-fetch multiplier when post-filtering may drop rows (legacy form paths). */
  fetchMultiplier?: number;
};

export type QueryCompletedTeamFixturesResult = {
  rows: CompletedTeamFixtureRow[];
  validCount: number;
  completeness: TeamHistoryCompleteness;
};

const FIXTURE_SELECT = `
  provider_id,
  kickoff_at,
  score_home,
  score_away,
  home_team:teams!fixtures_home_team_id_fkey (provider_id, name),
  away_team:teams!fixtures_away_team_id_fkey (provider_id, name),
  league:leagues (provider_id, name),
  season:seasons (year)
`;

export function evaluateTeamHistoryDataState(
  validCount: number
): TeamHistoryDataState {
  if (validCount >= TEAM_HISTORY_MIN_MATCHES) {
    return "DATA_COMPLETE";
  }
  if (validCount >= TEAM_HISTORY_PARTIAL_THRESHOLD) {
    return "DATA_PARTIAL";
  }
  return "DATA_INSUFFICIENT";
}

export function evaluateTeamHistoryCompleteness(
  validCount: number,
  scope: TeamHistoryScope
): TeamHistoryCompleteness {
  return {
    scope,
    validCount,
    state: evaluateTeamHistoryDataState(validCount),
  };
}

export function countValidCompletedRows(rows: TeamFixtureRow[]): number {
  let count = 0;
  for (const row of rows) {
    if (
      row.score_home != null &&
      row.score_away != null &&
      row.home_team &&
      row.away_team
    ) {
      count += 1;
    }
  }
  return count;
}

async function resolveLeagueUuids(
  leagueProviderIds: number[]
): Promise<string[]> {
  if (leagueProviderIds.length === 0) {
    return [];
  }

  const client = createAdminClient();
  const { data, error } = await client
    .from("leagues")
    .select("id")
    .in("provider_id", leagueProviderIds);

  if (error) {
    throw new Error(
      `Failed to resolve leagues for history query: ${error.message}`
    );
  }

  return (data ?? []).map((row) => row.id);
}

export async function queryCompletedTeamFixtures(
  input: QueryCompletedTeamFixturesInput
): Promise<QueryCompletedTeamFixturesResult> {
  const client = createAdminClient();
  const scope = input.scope ?? "ALL";
  const order = input.order ?? "desc";
  const limit = input.limit ?? TEAM_HISTORY_TARGET_MATCHES;
  const fetchLimit = Math.min(
    500,
    Math.max(limit, limit * (input.fetchMultiplier ?? 1))
  );

  let query = client
    .from("fixtures")
    .select(FIXTURE_SELECT)
    .in("status", [...TERMINAL_FIXTURE_STATUSES])
    .lt("kickoff_at", input.beforeAt)
    .not("score_home", "is", null)
    .not("score_away", "is", null)
    .order("kickoff_at", { ascending: order === "asc" })
    .limit(fetchLimit);

  if (scope === "HOME") {
    query = query.eq("home_team_id", input.teamUuid);
  } else if (scope === "AWAY") {
    query = query.eq("away_team_id", input.teamUuid);
  } else {
    query = query.or(
      `home_team_id.eq.${input.teamUuid},away_team_id.eq.${input.teamUuid}`
    );
  }

  if (input.leagueProviderIds != null && input.leagueProviderIds.length > 0) {
    const leagueIds = await resolveLeagueUuids(input.leagueProviderIds);
    if (leagueIds.length === 0) {
      return {
        rows: [],
        validCount: 0,
        completeness: evaluateTeamHistoryCompleteness(0, scope),
      };
    }
    query = query.in("league_id", leagueIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(
      `Failed to query completed team fixtures: ${error.message}`
    );
  }

  const allRows = (data ?? []) as CompletedTeamFixtureRow[];
  const rows = allRows.slice(0, limit);
  const validCount = rows.length;

  return {
    rows,
    validCount,
    completeness: evaluateTeamHistoryCompleteness(validCount, scope),
  };
}

export async function countCompletedTeamFixturesBefore(input: {
  teamUuid: string;
  beforeAt: string;
  scope?: TeamHistoryScope;
  leagueProviderIds?: number[];
}): Promise<number> {
  const client = createAdminClient();
  const scope = input.scope ?? "ALL";

  let query = client
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .in("status", [...TERMINAL_FIXTURE_STATUSES])
    .lt("kickoff_at", input.beforeAt)
    .not("score_home", "is", null)
    .not("score_away", "is", null);

  if (scope === "HOME") {
    query = query.eq("home_team_id", input.teamUuid);
  } else if (scope === "AWAY") {
    query = query.eq("away_team_id", input.teamUuid);
  } else {
    query = query.or(
      `home_team_id.eq.${input.teamUuid},away_team_id.eq.${input.teamUuid}`
    );
  }

  if (input.leagueProviderIds != null && input.leagueProviderIds.length > 0) {
    const leagueIds = await resolveLeagueUuids(input.leagueProviderIds);
    if (leagueIds.length === 0) {
      return 0;
    }
    query = query.in("league_id", leagueIds);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(
      `Failed to count completed team fixtures: ${error.message}`
    );
  }

  return count ?? 0;
}

export async function getTeamUuidByProviderId(
  teamProviderId: number
): Promise<string | null> {
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

export async function countCompletedTeamFixturesByProviderId(input: {
  teamProviderId: number;
  beforeAt: string;
  scope?: TeamHistoryScope;
  leagueProviderIds?: number[];
}): Promise<number> {
  const teamUuid = await getTeamUuidByProviderId(input.teamProviderId);
  if (!teamUuid) {
    return 0;
  }

  return countCompletedTeamFixturesBefore({
    teamUuid,
    beforeAt: input.beforeAt,
    scope: input.scope,
    leagueProviderIds: input.leagueProviderIds,
  });
}

export type BuildMultiSeasonWindowInput = {
  teamUuid: string;
  teamProviderId: number;
  beforeAt: string;
  limit: number;
  scope?: TeamHistoryScope;
  /** Primary league for season walk (e.g. fixture league). */
  leagueProviderId?: number;
  allowCrossCompetition?: boolean;
};

/**
 * Builds a chronological window (newest first) up to `limit` completed matches.
 * When leagueProviderId is set, walks seasons within that league before optional cross-competition fill.
 */
export async function buildMultiSeasonCompletedWindow(
  input: BuildMultiSeasonWindowInput
): Promise<QueryCompletedTeamFixturesResult> {
  const scope = input.scope ?? "ALL";
  const leagueFilter =
    input.leagueProviderId != null ? [input.leagueProviderId] : undefined;

  const primary = await queryCompletedTeamFixtures({
    teamUuid: input.teamUuid,
    beforeAt: input.beforeAt,
    scope,
    limit: input.limit,
    leagueProviderIds: leagueFilter,
    order: "desc",
  });

  if (
    primary.validCount >= input.limit ||
    input.leagueProviderId == null ||
    input.allowCrossCompetition === false
  ) {
    return primary;
  }

  const remaining = input.limit - primary.validCount;
  if (remaining <= 0) {
    return primary;
  }

  const cross = await queryCompletedTeamFixtures({
    teamUuid: input.teamUuid,
    beforeAt: input.beforeAt,
    scope,
    limit: remaining + primary.validCount,
    order: "desc",
  });

  const seen = new Set(primary.rows.map((row) => row.provider_id));
  const merged = [...primary.rows];
  for (const row of cross.rows) {
    if (seen.has(row.provider_id)) {
      continue;
    }
    merged.push(row);
    seen.add(row.provider_id);
    if (merged.length >= input.limit) {
      break;
    }
  }

  const validCount = merged.length;
  return {
    rows: merged,
    validCount,
    completeness: evaluateTeamHistoryCompleteness(validCount, scope),
  };
}

export async function evaluateTeamHistoryCompletenessByScopes(input: {
  teamUuid: string;
  beforeAt: string;
  leagueProviderIds?: number[];
}): Promise<TeamHistoryCompleteness[]> {
  const scopes: TeamHistoryScope[] = ["ALL", "HOME", "AWAY"];
  const results: TeamHistoryCompleteness[] = [];

  for (const scope of scopes) {
    const count = await countCompletedTeamFixturesBefore({
      teamUuid: input.teamUuid,
      beforeAt: input.beforeAt,
      scope,
      leagueProviderIds: input.leagueProviderIds,
    });
    results.push(evaluateTeamHistoryCompleteness(count, scope));
  }

  return results;
}
