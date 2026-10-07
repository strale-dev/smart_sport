import { competitionSupportsLineups } from "@/lib/competitions/capabilities";
import { findCompetition } from "@/lib/competitions/index";
import { getFixtureLineups as getFixtureLineupsEndpoint } from "@/lib/api-football/endpoints/fixtures";
import {
  fetchFixtureResource,
  shouldPersistResourceWrite,
} from "@/lib/ingestion/fixture-resource-fetch";
import { withFixtureMatchDetailsLock } from "@/lib/ingestion/fixture-match-details-lock";
import {
  buildFixtureMatchIngestionState,
  dependencyRecordFromFetch,
  ingestionOutcomeToOk,
  persistMatchIngestionState,
  shouldSkipMatchDetailIngestForStatus,
  type IngestionOutcome,
  type ProviderDataAvailability,
} from "@/lib/ingestion/ingestion-result";
import { ingestFixtureSidelinedFromProvider } from "@/lib/ingestion/ingest-sidelined";
import { logFixtureIngestUnit } from "@/lib/ingestion/ingestion-observability";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  getFixtureIngestContext,
  upsertLineups,
} from "@/lib/ingestion/match-details-upsert";
import { dispatchLineupConfirmedNotifications } from "@/lib/notifications/dispatch-lineup-confirmed";
import { writeCachedValue } from "@/lib/redis/cache";
import { CACHE_TTL, providerFixtureLineupsKey } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";

export type IngestLineupsOptions = {
  persistFixtureState?: boolean;
};

export type IngestLineupsResult = {
  ok: boolean;
  outcome: IngestionOutcome;
  availability?: ProviderDataAvailability;
  fixtureProviderId: number;
  stats: {
    lineups: number;
    apiRequests: number;
  };
  reason?: string;
};

export async function ingestLineupsFromProvider(
  fixtureProviderId: number,
  options: IngestLineupsOptions = {}
): Promise<IngestLineupsResult> {
  const persistFixtureState = options.persistFixtureState ?? true;
  const client = createAdminClient();
  const context = await getFixtureIngestContext(client, fixtureProviderId);

  if (!context) {
    return {
      ok: false,
      outcome: "PERMANENT_FAILURE",
      fixtureProviderId,
      stats: { lineups: 0, apiRequests: 0 },
      reason: "Fixture not found in Postgres",
    };
  }

  const statusSkip = shouldSkipMatchDetailIngestForStatus(context.status);
  if (statusSkip.skip) {
    return {
      ok: true,
      outcome: "SKIPPED",
      fixtureProviderId,
      stats: { lineups: 0, apiRequests: 0 },
      reason: statusSkip.reason,
    };
  }

  const competition =
    context.leagueProviderId != null
      ? findCompetition(context.leagueProviderId)
      : undefined;

  if (!competitionSupportsLineups(competition)) {
    return {
      ok: true,
      outcome: "SKIPPED",
      fixtureProviderId,
      stats: { lineups: 0, apiRequests: 0 },
      reason: "Lineups not supported for competition",
    };
  }

  await throttleProviderRequest();
  const lineupsFetch = await fetchFixtureResource(
    `fixture ${fixtureProviderId} lineups`,
    "lineups",
    {
      fixtureStatus: context.status,
      kickoffAt: context.kickoffAt,
      supported: true,
    },
    () => getFixtureLineupsEndpoint(fixtureProviderId)
  );

  let lineupsCount = 0;
  let dependencyOutcome: IngestionOutcome = lineupsFetch.outcome;
  let dependencyReason = lineupsFetch.reason;

  if (
    lineupsFetch.outcome === "SUCCESS" &&
    lineupsFetch.value &&
    shouldPersistResourceWrite(
      lineupsFetch.availability,
      lineupsFetch.rowCount
    ) &&
    lineupsFetch.rowCount > 0
  ) {
    const lock = await withFixtureMatchDetailsLock(fixtureProviderId, () =>
      upsertLineups(client, context.fixtureUuid, lineupsFetch.value!)
    );

    if (!lock.acquired) {
      dependencyOutcome = "RETRYABLE_FAILURE";
      dependencyReason = lock.reason;
    } else {
      lineupsCount = lock.value;

      const hasConfirmedLineup = lineupsFetch.value.some(
        (entry) => entry.isConfirmed
      );
      if (hasConfirmedLineup) {
        await dispatchLineupConfirmedNotifications(fixtureProviderId);
      }

      await writeCachedValue(
        providerFixtureLineupsKey(fixtureProviderId),
        lineupsFetch.value,
        CACHE_TTL.fixtureLineupsStale
      );
    }
  }

  const dependency = dependencyRecordFromFetch({
    dependency: "lineups",
    fixtureStatus: context.status,
    kickoffAt: context.kickoffAt,
    supported: true,
    fetchOutcome: dependencyOutcome,
    reason: dependencyReason,
    rowCount: lineupsCount,
    availability: lineupsFetch.availability,
  });

  if (persistFixtureState) {
    const state = buildFixtureMatchIngestionState({ lineups: dependency });
    await persistMatchIngestionState(client, context.fixtureUuid, state);
  }

  try {
    await ingestFixtureSidelinedFromProvider(fixtureProviderId);
  } catch (error) {
    console.warn(
      `[ingest] sidelined skipped for fixture ${fixtureProviderId}`,
      error
    );
  }

  logFixtureIngestUnit({
    job_name: "ingest-lineups",
    fixtureProviderId,
    resource: "lineups",
    outcome: dependency.outcome,
    persisted: lineupsCount > 0,
    skippedReason: dependency.reason,
    retryable: dependency.outcome === "RETRYABLE_FAILURE",
    providerPath: "/fixtures/lineups",
    detail: { lineups: lineupsCount, apiRequests: 1 },
  });

  return {
    ok: ingestionOutcomeToOk(dependency.outcome),
    outcome: dependency.outcome,
    availability: dependency.availability,
    fixtureProviderId,
    stats: {
      lineups: lineupsCount,
      apiRequests: 1,
    },
    reason: dependency.reason,
  };
}
