import {
  collectFormResults,
  type TeamFixtureRow,
} from "@/lib/analytics/compute-form";
import {
  buildMultiSeasonCompletedWindow,
  queryCompletedTeamFixtures,
  TEAM_HISTORY_TARGET_MATCHES,
  type CompletedTeamFixtureRow,
} from "@/lib/analytics/team-history-query";
import type { FormScope } from "@/types/domain";

export type LoadTeamHistoryRowsInput = {
  teamUuid: string;
  teamProviderId: number;
  beforeAt: string;
  scope?: FormScope;
  limit?: number;
  leagueProviderId?: number;
  allowCrossCompetition?: boolean;
};

export async function loadTeamHistoryRows(
  input: LoadTeamHistoryRowsInput
): Promise<CompletedTeamFixtureRow[]> {
  const limit = input.limit ?? TEAM_HISTORY_TARGET_MATCHES;
  const scope = input.scope ?? "ALL";

  if (input.leagueProviderId != null) {
    const result = await buildMultiSeasonCompletedWindow({
      teamUuid: input.teamUuid,
      teamProviderId: input.teamProviderId,
      beforeAt: input.beforeAt,
      limit,
      scope,
      leagueProviderId: input.leagueProviderId,
      allowCrossCompetition: input.allowCrossCompetition,
    });
    return result.rows;
  }

  const result = await queryCompletedTeamFixtures({
    teamUuid: input.teamUuid,
    beforeAt: input.beforeAt,
    scope,
    limit,
    order: "desc",
  });
  return result.rows;
}

export function scopeFilterRows(
  rows: TeamFixtureRow[],
  teamProviderId: number,
  scope: FormScope
): TeamFixtureRow[] {
  if (scope === "ALL") {
    return rows;
  }
  return rows.filter((row) => {
    if (scope === "HOME") {
      return row.home_team?.provider_id === teamProviderId;
    }
    return row.away_team?.provider_id === teamProviderId;
  });
}

export function formResultsForScope(
  rows: TeamFixtureRow[],
  teamProviderId: number,
  scope: FormScope,
  maxResults: number
) {
  const scoped = scopeFilterRows(rows, teamProviderId, scope);
  return collectFormResults(scoped, teamProviderId, maxResults);
}
