import {
  aggregateForm,
  type TeamFixtureRow,
} from "@/lib/analytics/compute-form";
import { loadXgPairsByFixtureProviderIds } from "@/lib/analytics/fixture-xg-batch";
import {
  buildPeriodCompare,
  buildWindowOutcomeMetrics,
} from "@/lib/analytics/history-window-metrics";
import type {
  HistoryWindowKey,
  RecentMatchExample,
  TeamHistoryFeatures,
  TeamHistoryScope,
} from "@/lib/analytics/history-feature-types";
import {
  HISTORY_WINDOW_LIMITS,
  MAX_RECENT_EXAMPLES,
} from "@/lib/analytics/history-feature-types";
import { buildOpponentEloAtKickoffMap } from "@/lib/analytics/opponent-strength";
import { computeRestDaysBefore } from "@/lib/analytics/point-in-time";
import {
  evaluateTeamHistoryCompletenessByScopes,
  type CompletedTeamFixtureRow,
} from "@/lib/analytics/team-history-query";
import {
  formResultsForScope,
  loadTeamHistoryRows,
  scopeFilterRows,
} from "@/lib/analytics/team-history-context";
import { createAdminClient } from "@/lib/supabase/admin";

const WINDOW_KEYS: HistoryWindowKey[] = [5, 10, 20, 30, "30plus"];
const SCOPES: TeamHistoryScope[] = ["ALL", "HOME", "AWAY"];

async function enrichRowsWithFixtureIds(rows: CompletedTeamFixtureRow[]) {
  if (rows.length === 0) {
    return [] as Array<
      CompletedTeamFixtureRow & {
        id: string;
        home_team_id: string;
        away_team_id: string;
      }
    >;
  }
  const client = createAdminClient();
  const providerIds = rows.map((r) => r.provider_id);
  const { data, error } = await client
    .from("fixtures")
    .select("id, provider_id, home_team_id, away_team_id")
    .in("provider_id", providerIds);

  if (error) {
    throw new Error(`Failed to enrich fixture ids: ${error.message}`);
  }

  const byProvider = new Map((data ?? []).map((row) => [row.provider_id, row]));

  return rows
    .map((row) => {
      const db = byProvider.get(row.provider_id);
      if (!db) {
        return null;
      }
      return {
        ...row,
        id: db.id,
        home_team_id: db.home_team_id,
        away_team_id: db.away_team_id,
      };
    })
    .filter(
      (
        row
      ): row is CompletedTeamFixtureRow & {
        id: string;
        home_team_id: string;
        away_team_id: string;
      } => row != null
    );
}

async function loadXgForRows(
  rows: CompletedTeamFixtureRow[],
  teamUuid: string
) {
  const withIds = await enrichRowsWithFixtureIds(rows);
  return loadXgPairsByFixtureProviderIds({
    fixtures: withIds.map((r) => ({
      fixtureId: r.id,
      providerId: r.provider_id,
      homeTeamId: r.home_team_id,
      awayTeamId: r.away_team_id,
    })),
    teamUuid,
  });
}

function buildRecentExamples(
  rows: TeamFixtureRow[],
  teamProviderId: number,
  limit: number
): RecentMatchExample[] {
  const results = formResultsForScope(rows, teamProviderId, "ALL", limit);
  return results.map((r) => ({
    fixtureExternalId: r.fixtureExternalId,
    kickoffAt: r.kickoffAt,
    opponentName: r.opponentName,
    isHome: r.isHome,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    result: r.result,
    leagueName:
      rows.find((row) => row.provider_id === r.fixtureExternalId)?.league
        ?.name ?? null,
  }));
}

function formSummaryFromResults(
  teamProviderId: number,
  rows: TeamFixtureRow[]
): string | null {
  const results = formResultsForScope(rows, teamProviderId, "ALL", 5);
  if (results.length === 0) {
    return null;
  }
  const snap = aggregateForm(results, "ALL", 5);
  return `${snap.wins}W-${snap.draws}D-${snap.losses}L (${snap.goalsFor} GF / ${snap.goalsAgainst} GA)`;
}

export type BuildTeamHistoryFeaturesInput = {
  teamProviderId: number;
  teamUuid: string;
  beforeAt: string;
  leagueProviderId?: number;
  allowCrossCompetition?: boolean;
};

export async function buildTeamHistoryFeatures(
  input: BuildTeamHistoryFeaturesInput
): Promise<TeamHistoryFeatures> {
  const baseRows = await loadTeamHistoryRows({
    teamUuid: input.teamUuid,
    teamProviderId: input.teamProviderId,
    beforeAt: input.beforeAt,
    scope: "ALL",
    limit: HISTORY_WINDOW_LIMITS["30plus"],
    leagueProviderId: input.leagueProviderId,
    allowCrossCompetition: input.allowCrossCompetition,
  });

  const [completenessByScope, restDays, xgMap, opponentEloMap] =
    await Promise.all([
      evaluateTeamHistoryCompletenessByScopes({
        teamUuid: input.teamUuid,
        beforeAt: input.beforeAt,
        leagueProviderIds:
          input.leagueProviderId != null ? [input.leagueProviderId] : undefined,
      }),
      computeRestDaysBefore(input.teamUuid, input.beforeAt),
      loadXgForRows(baseRows, input.teamUuid),
      buildOpponentEloAtKickoffMap({
        teamProviderId: input.teamProviderId,
        rows: baseRows,
        beforeAt: input.beforeAt,
      }),
    ]);

  const windows: TeamHistoryFeatures["windows"] = {};

  for (const scope of SCOPES) {
    const scopeRows = scopeFilterRows(baseRows, input.teamProviderId, scope);
    const allResults = formResultsForScope(
      scopeRows,
      input.teamProviderId,
      scope,
      HISTORY_WINDOW_LIMITS["30plus"]
    );

    windows[scope] = {};
    for (const window of WINDOW_KEYS) {
      windows[scope]![window] = buildWindowOutcomeMetrics({
        window,
        scope,
        beforeAt: input.beforeAt,
        results: allResults,
        xgByFixtureId: xgMap,
        opponentEloByFixtureId: opponentEloMap,
      });
    }
  }

  const allResultsForCompare = formResultsForScope(
    baseRows,
    input.teamProviderId,
    "ALL",
    20
  );

  return {
    teamProviderId: input.teamProviderId,
    beforeAt: input.beforeAt,
    restDays,
    completenessByScope,
    windows,
    periodCompare: [
      buildPeriodCompare({
        beforeAt: input.beforeAt,
        results: allResultsForCompare,
        recentSize: 5,
      }),
      buildPeriodCompare({
        beforeAt: input.beforeAt,
        results: allResultsForCompare,
        recentSize: 10,
      }),
    ],
    recentExamples: buildRecentExamples(
      baseRows,
      input.teamProviderId,
      MAX_RECENT_EXAMPLES
    ),
    formSummaryLast5: formSummaryFromResults(input.teamProviderId, baseRows),
  };
}
