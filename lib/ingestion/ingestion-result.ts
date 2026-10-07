import {
  competitionSupportsFixtureEvents,
  competitionSupportsFixtureStatistics,
  competitionSupportsLineups,
  competitionSupportsPlayerPerformances,
} from "@/lib/competitions/capabilities";
import type { CompetitionDefinition } from "@/lib/competitions/types";
import { isTerminalFixtureStatus } from "@/lib/ingestion/config";
import { LINEUP_PUBLISH_LEAD_MS } from "@/lib/match/overview-hydrate-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FixtureStatus } from "@/types/domain";
export type IngestionOutcome =
  "SUCCESS" | "PARTIAL" | "SKIPPED" | "RETRYABLE_FAILURE" | "PERMANENT_FAILURE";

export type ProviderDataAvailability =
  "NOT_YET_AVAILABLE" | "PROVIDER_RETURNED_NO_DATA" | "AVAILABLE";

export type MatchDependencyKind =
  "fixture_row" | "events" | "statistics" | "lineups" | "player_performances";

export type DependencyIngestionRecord = {
  outcome: IngestionOutcome;
  availability?: ProviderDataAvailability;
  reason?: string;
  fetchedAt: string;
  rowCount?: number;
};

export type FixtureMatchIngestionState = {
  version: 1;
  updatedAt: string;
  aggregate: IngestionOutcome;
  dependencies: Partial<Record<MatchDependencyKind, DependencyIngestionRecord>>;
};

const PRE_MATCH_STATUSES = new Set<FixtureStatus>(["NS", "TBD"]);

const DETAIL_SKIP_STATUSES = new Set<FixtureStatus>([
  "PST",
  "CANC",
  "ABD",
  "WO",
  "AWD",
]);

const FINISHED_WITH_STATS_EXPECTED = new Set<FixtureStatus>([
  "FT",
  "AET",
  "PEN",
]);

export function isPreMatchFixtureStatus(status: FixtureStatus): boolean {
  return PRE_MATCH_STATUSES.has(status);
}

export function shouldSkipMatchDetailIngestForStatus(
  status: FixtureStatus
): { skip: true; reason: string } | { skip: false } {
  if (DETAIL_SKIP_STATUSES.has(status)) {
    return { skip: true, reason: `fixture_status_${status.toLowerCase()}` };
  }
  return { skip: false };
}

export function classifyEmptyProviderPayload(input: {
  dependency: MatchDependencyKind;
  fixtureStatus: FixtureStatus;
  kickoffAt: string;
  now?: Date;
}): ProviderDataAvailability {
  const now = input.now ?? new Date();
  const kickoffMs = Date.parse(input.kickoffAt);

  if (input.dependency === "lineups") {
    if (
      Number.isFinite(kickoffMs) &&
      kickoffMs - now.getTime() > LINEUP_PUBLISH_LEAD_MS
    ) {
      return "NOT_YET_AVAILABLE";
    }
    if (isPreMatchFixtureStatus(input.fixtureStatus)) {
      return "NOT_YET_AVAILABLE";
    }
  }

  if (
    isPreMatchFixtureStatus(input.fixtureStatus) ||
    (!isTerminalFixtureStatus(input.fixtureStatus) &&
      !FINISHED_WITH_STATS_EXPECTED.has(input.fixtureStatus))
  ) {
    return "NOT_YET_AVAILABLE";
  }

  return "PROVIDER_RETURNED_NO_DATA";
}

export function dependencyRecordFromFetch(input: {
  dependency: MatchDependencyKind;
  fixtureStatus: FixtureStatus;
  kickoffAt: string;
  supported: boolean;
  fetchOutcome: IngestionOutcome;
  reason?: string;
  rowCount?: number;
  availability?: ProviderDataAvailability;
  fetchedAt?: string;
}): DependencyIngestionRecord {
  const fetchedAt = input.fetchedAt ?? new Date().toISOString();

  if (!input.supported) {
    return {
      outcome: "SKIPPED",
      reason:
        input.reason ?? `${input.dependency}_not_supported_for_competition`,
      fetchedAt,
      rowCount: 0,
    };
  }

  if (input.fetchOutcome !== "SUCCESS") {
    return {
      outcome: input.fetchOutcome,
      reason: input.reason,
      fetchedAt,
      rowCount: input.rowCount ?? 0,
      availability: input.availability,
    };
  }

  const rowCount = input.rowCount ?? 0;
  if (rowCount > 0) {
    return {
      outcome: "SUCCESS",
      availability: "AVAILABLE",
      fetchedAt,
      rowCount,
    };
  }

  const availability =
    input.availability ??
    classifyEmptyProviderPayload({
      dependency: input.dependency,
      fixtureStatus: input.fixtureStatus,
      kickoffAt: input.kickoffAt,
    });

  if (availability === "NOT_YET_AVAILABLE") {
    return {
      outcome: "SKIPPED",
      availability,
      reason: `${input.dependency}_not_yet_available`,
      fetchedAt,
      rowCount: 0,
    };
  }

  return {
    outcome: "SUCCESS",
    availability,
    reason:
      availability === "PROVIDER_RETURNED_NO_DATA"
        ? `${input.dependency}_provider_returned_no_data`
        : undefined,
    fetchedAt,
    rowCount: 0,
  };
}

const OUTCOME_RANK: Record<IngestionOutcome, number> = {
  SUCCESS: 0,
  SKIPPED: 1,
  PARTIAL: 2,
  RETRYABLE_FAILURE: 3,
  PERMANENT_FAILURE: 4,
};

export function aggregateIngestionOutcomes(
  records: DependencyIngestionRecord[]
): IngestionOutcome {
  if (records.length === 0) {
    return "SKIPPED";
  }

  const outcomes = records.map((record) => record.outcome);
  const hasSuccess = outcomes.includes("SUCCESS");
  const hasSkipped = outcomes.includes("SKIPPED");
  const hasRetryable = outcomes.includes("RETRYABLE_FAILURE");
  const hasPermanent = outcomes.includes("PERMANENT_FAILURE");
  const hasPartial = outcomes.includes("PARTIAL");

  if (hasPermanent && !hasSuccess) {
    return "PERMANENT_FAILURE";
  }
  if (hasRetryable && !hasSuccess) {
    return "RETRYABLE_FAILURE";
  }
  if (hasPermanent || hasRetryable || hasPartial) {
    return "PARTIAL";
  }
  if (hasSuccess && hasSkipped) {
    return "PARTIAL";
  }
  if (hasSuccess) {
    return "SUCCESS";
  }
  if (hasSkipped && outcomes.every((o) => o === "SKIPPED")) {
    return "SKIPPED";
  }

  return records.reduce(
    (worst, record) =>
      OUTCOME_RANK[record.outcome] > OUTCOME_RANK[worst]
        ? record.outcome
        : worst,
    records[0]!.outcome
  );
}

export function buildFixtureMatchIngestionState(
  dependencies: Partial<Record<MatchDependencyKind, DependencyIngestionRecord>>
): FixtureMatchIngestionState {
  const records = Object.values(dependencies).filter(
    (record): record is DependencyIngestionRecord => record != null
  );
  const updatedAt = new Date().toISOString();
  return {
    version: 1,
    updatedAt,
    aggregate: aggregateIngestionOutcomes(records),
    dependencies,
  };
}

export function ingestionOutcomeToOk(outcome: IngestionOutcome): boolean {
  return (
    outcome === "SUCCESS" || outcome === "PARTIAL" || outcome === "SKIPPED"
  );
}

export function mergeReasons(
  records: Array<DependencyIngestionRecord | undefined>
): string | undefined {
  const parts = records
    .map((record) => {
      if (!record || record.outcome === "SUCCESS") {
        return null;
      }
      return record.reason ?? record.outcome;
    })
    .filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

type AdminClient = ReturnType<typeof createAdminClient>;

export async function persistMatchIngestionState(
  client: AdminClient,
  fixtureUuid: string,
  state: FixtureMatchIngestionState
): Promise<void> {
  void client;
  void state;
  const { evaluateAndPersistFixtureReadiness } =
    await import("@/lib/fixtures/readiness");
  try {
    await evaluateAndPersistFixtureReadiness({ fixtureUuid });
  } catch (error) {
    console.error(
      `[ingestion-result] readiness refresh failed for ${fixtureUuid}`,
      error
    );
  }
}

export type FixtureDependencyCompleteness = {
  complete: boolean;
  missing: MatchDependencyKind[];
};

export function expectedDependenciesForFixture(input: {
  fixtureStatus: FixtureStatus;
  competition: CompetitionDefinition | undefined;
}): MatchDependencyKind[] {
  const skip = shouldSkipMatchDetailIngestForStatus(input.fixtureStatus);
  if (skip.skip) {
    return [];
  }

  if (!isTerminalFixtureStatus(input.fixtureStatus)) {
    return [];
  }

  const deps: MatchDependencyKind[] = [];
  const competition = input.competition;

  if (competitionSupportsFixtureEvents(competition)) {
    deps.push("events");
  }
  if (competitionSupportsFixtureStatistics(competition)) {
    deps.push("statistics");
  }
  if (competitionSupportsPlayerPerformances(competition)) {
    deps.push("player_performances");
  }
  if (competitionSupportsLineups(competition)) {
    deps.push("lineups");
  }

  return deps;
}

export async function evaluateFixtureDependencyCompleteness(
  client: AdminClient,
  fixtureUuid: string,
  input: {
    fixtureStatus: FixtureStatus;
    kickoffAt: string;
    competition: CompetitionDefinition | undefined;
  }
): Promise<FixtureDependencyCompleteness> {
  const expected = expectedDependenciesForFixture({
    fixtureStatus: input.fixtureStatus,
    competition: input.competition,
  });

  if (expected.length === 0) {
    return { complete: true, missing: [] };
  }

  const missing: MatchDependencyKind[] = [];

  for (const dep of expected) {
    const satisfied = await dependencySatisfiedInDb(client, fixtureUuid, dep, {
      fixtureStatus: input.fixtureStatus,
      kickoffAt: input.kickoffAt,
    });
    if (!satisfied) {
      missing.push(dep);
    }
  }

  return { complete: missing.length === 0, missing };
}

async function dependencySatisfiedInDb(
  client: AdminClient,
  fixtureUuid: string,
  dependency: MatchDependencyKind,
  context: { fixtureStatus: FixtureStatus; kickoffAt: string }
): Promise<boolean> {
  switch (dependency) {
    case "events": {
      const { count, error } = await client
        .from("fixture_events")
        .select("*", { count: "exact", head: true })
        .eq("fixture_id", fixtureUuid)
        .not("player_id", "is", null);
      if (error) {
        throw new Error(`Failed to check fixture events: ${error.message}`);
      }
      return (count ?? 0) > 0;
    }
    case "statistics": {
      const { count, error } = await client
        .from("fixture_statistics")
        .select("*", { count: "exact", head: true })
        .eq("fixture_id", fixtureUuid);
      if (error) {
        throw new Error(`Failed to check fixture statistics: ${error.message}`);
      }
      if ((count ?? 0) >= 2) {
        return true;
      }
      if (
        (count ?? 0) === 0 &&
        classifyEmptyProviderPayload({
          dependency: "statistics",
          fixtureStatus: context.fixtureStatus,
          kickoffAt: context.kickoffAt,
        }) === "NOT_YET_AVAILABLE"
      ) {
        return true;
      }
      return false;
    }
    case "lineups": {
      const { count, error } = await client
        .from("lineups")
        .select("*", { count: "exact", head: true })
        .eq("fixture_id", fixtureUuid);
      if (error) {
        throw new Error(`Failed to check lineups: ${error.message}`);
      }
      if ((count ?? 0) >= 2) {
        return true;
      }
      if (
        classifyEmptyProviderPayload({
          dependency: "lineups",
          fixtureStatus: context.fixtureStatus,
          kickoffAt: context.kickoffAt,
        }) === "NOT_YET_AVAILABLE"
      ) {
        return true;
      }
      return false;
    }
    case "player_performances": {
      const { count, error } = await client
        .from("player_match_performances")
        .select("*", { count: "exact", head: true })
        .eq("fixture_id", fixtureUuid);
      if (error) {
        throw new Error(
          `Failed to check player performances: ${error.message}`
        );
      }
      return (count ?? 0) > 0;
    }
    default:
      return true;
  }
}

export async function fixtureNeedsMatchDetailSync(
  client: AdminClient,
  fixtureUuid: string,
  input: {
    fixtureStatus: FixtureStatus;
    kickoffAt: string;
    competition: CompetitionDefinition | undefined;
  }
): Promise<boolean> {
  const result = await evaluateFixtureDependencyCompleteness(
    client,
    fixtureUuid,
    input
  );
  return !result.complete;
}
