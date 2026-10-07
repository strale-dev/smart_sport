import {
  getFixtureEvents as getFixtureEventsEndpoint,
  getFixturePlayers as getFixturePlayersEndpoint,
  getFixtureStatistics as getFixtureStatisticsEndpoint,
} from "@/lib/api-football/endpoints/fixtures";
import {
  competitionSupportsFixtureEvents,
  competitionSupportsFixtureStatistics,
  competitionSupportsLineups,
  competitionSupportsPlayerPerformances,
} from "@/lib/competitions/capabilities";
import { findCompetition } from "@/lib/competitions/index";
import {
  fetchFixtureResource,
  shouldPersistResourceWrite,
} from "@/lib/ingestion/fixture-resource-fetch";
import { withFixtureMatchDetailsLock } from "@/lib/ingestion/fixture-match-details-lock";
import {
  buildFixtureMatchIngestionState,
  dependencyRecordFromFetch,
  ingestionOutcomeToOk,
  mergeReasons,
  persistMatchIngestionState,
  shouldSkipMatchDetailIngestForStatus,
  type DependencyIngestionRecord,
  type FixtureMatchIngestionState,
  type IngestionOutcome,
  type MatchDependencyKind,
  type ProviderDataAvailability,
} from "@/lib/ingestion/ingestion-result";
import { ingestLineupsFromProvider } from "@/lib/ingestion/ingest-lineups";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  getFixtureIngestContext,
  upsertFixtureEvents,
  upsertFixtureStatistics,
  upsertPlayerMatchPerformances,
} from "@/lib/ingestion/match-details-upsert";
import { writeCachedValue } from "@/lib/redis/cache";
import {
  CACHE_TTL,
  providerFixtureEventsKey,
  providerFixturePlayersKey,
  providerFixtureStatsKey,
} from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";

export type IngestMatchDetailsOptions = {
  /** Overview hydrate skips lineups — lineups tab owns that flow for now. */
  skipLineups?: boolean;
};

export type IngestMatchDetailsResult = {
  ok: boolean;
  outcome: IngestionOutcome;
  fixtureProviderId: number;
  stats: {
    events: number;
    statistics: number;
    lineups: number;
    playerPerformances: number;
    apiRequests: number;
  };
  reason?: string;
  ingestionState?: FixtureMatchIngestionState;
};

function writePolicyForAvailability(
  availability: ProviderDataAvailability | undefined,
  rowCount: number
) {
  return {
    allowReplace: shouldPersistResourceWrite(availability, rowCount),
  };
}

export async function ingestMatchDetailsFromProvider(
  fixtureProviderId: number,
  options: IngestMatchDetailsOptions = {}
): Promise<IngestMatchDetailsResult> {
  const client = createAdminClient();
  const context = await getFixtureIngestContext(client, fixtureProviderId);

  const emptyStats = {
    events: 0,
    statistics: 0,
    lineups: 0,
    playerPerformances: 0,
    apiRequests: 0,
  };

  if (!context) {
    return {
      ok: false,
      outcome: "PERMANENT_FAILURE",
      fixtureProviderId,
      stats: emptyStats,
      reason: "Fixture not found in Postgres",
    };
  }

  const statusSkip = shouldSkipMatchDetailIngestForStatus(context.status);
  if (statusSkip.skip) {
    const dependencies: Partial<
      Record<MatchDependencyKind, DependencyIngestionRecord>
    > = {
      events: {
        outcome: "SKIPPED",
        reason: statusSkip.reason,
        fetchedAt: new Date().toISOString(),
        rowCount: 0,
      },
    };
    const state = buildFixtureMatchIngestionState(dependencies);
    await persistMatchIngestionState(client, context.fixtureUuid, state);
    return {
      ok: true,
      outcome: "SKIPPED",
      fixtureProviderId,
      stats: emptyStats,
      reason: statusSkip.reason,
      ingestionState: state,
    };
  }

  const competition =
    context.leagueProviderId != null
      ? findCompetition(context.leagueProviderId)
      : undefined;

  let apiRequests = 0;
  const dependencies: Partial<
    Record<MatchDependencyKind, DependencyIngestionRecord>
  > = {};

  const eventsFetch = await (async () => {
    await throttleProviderRequest();
    apiRequests += 1;
    return fetchFixtureResource(
      `fixture ${fixtureProviderId} events`,
      "events",
      {
        fixtureStatus: context.status,
        kickoffAt: context.kickoffAt,
        supported: competitionSupportsFixtureEvents(competition),
      },
      () => getFixtureEventsEndpoint(fixtureProviderId)
    );
  })();

  let eventsCount = 0;
  if (
    eventsFetch.outcome === "SUCCESS" &&
    eventsFetch.value &&
    eventsFetch.rowCount > 0
  ) {
    const lock = await withFixtureMatchDetailsLock(fixtureProviderId, () =>
      upsertFixtureEvents(
        client,
        context.fixtureUuid,
        eventsFetch.value!,
        writePolicyForAvailability(
          eventsFetch.availability,
          eventsFetch.rowCount
        )
      )
    );
    if (!lock.acquired) {
      dependencies.events = {
        outcome: "RETRYABLE_FAILURE",
        reason: lock.reason,
        fetchedAt: new Date().toISOString(),
        rowCount: 0,
      };
    } else {
      eventsCount = lock.value;
      await writeCachedValue(
        providerFixtureEventsKey(fixtureProviderId),
        eventsFetch.value,
        CACHE_TTL.fixtureEventsStale
      );
      dependencies.events = dependencyRecordFromFetch({
        dependency: "events",
        fixtureStatus: context.status,
        kickoffAt: context.kickoffAt,
        supported: true,
        fetchOutcome: "SUCCESS",
        rowCount: eventsCount,
        availability: "AVAILABLE",
      });
    }
  }

  if (!dependencies.events) {
    dependencies.events = dependencyRecordFromFetch({
      dependency: "events",
      fixtureStatus: context.status,
      kickoffAt: context.kickoffAt,
      supported: competitionSupportsFixtureEvents(competition),
      fetchOutcome: eventsFetch.outcome,
      reason: eventsFetch.reason,
      rowCount: eventsCount,
      availability: eventsFetch.availability,
    });
  }

  const statisticsFetch = await (async () => {
    await throttleProviderRequest();
    apiRequests += 1;
    return fetchFixtureResource(
      `fixture ${fixtureProviderId} statistics`,
      "statistics",
      {
        fixtureStatus: context.status,
        kickoffAt: context.kickoffAt,
        supported: competitionSupportsFixtureStatistics(competition),
      },
      () => getFixtureStatisticsEndpoint(fixtureProviderId)
    );
  })();

  let statisticsCount = 0;
  if (
    statisticsFetch.outcome === "SUCCESS" &&
    statisticsFetch.value &&
    statisticsFetch.rowCount > 0
  ) {
    const statsResult = await upsertFixtureStatistics(
      client,
      context.fixtureUuid,
      statisticsFetch.value,
      writePolicyForAvailability(
        statisticsFetch.availability,
        statisticsFetch.rowCount
      )
    );
    statisticsCount = statsResult.upserted;
    if (statsResult.skippedMissingTeam > 0) {
      dependencies.statistics = {
        outcome: "PARTIAL",
        availability: "AVAILABLE",
        reason: "statistics_missing_team_uuid",
        fetchedAt: new Date().toISOString(),
        rowCount: statisticsCount,
      };
    }
    await writeCachedValue(
      providerFixtureStatsKey(fixtureProviderId),
      statisticsFetch.value,
      CACHE_TTL.fixtureStatsStale
    );
  }

  if (!dependencies.statistics) {
    dependencies.statistics = dependencyRecordFromFetch({
      dependency: "statistics",
      fixtureStatus: context.status,
      kickoffAt: context.kickoffAt,
      supported: competitionSupportsFixtureStatistics(competition),
      fetchOutcome: statisticsFetch.outcome,
      reason: statisticsFetch.reason,
      rowCount: statisticsCount,
      availability: statisticsFetch.availability,
    });
  }

  let lineupsCount = 0;
  if (!options.skipLineups && competitionSupportsLineups(competition)) {
    const lineupsResult = await ingestLineupsFromProvider(fixtureProviderId, {
      persistFixtureState: false,
    });
    apiRequests += lineupsResult.stats.apiRequests;
    lineupsCount = lineupsResult.stats.lineups;
    dependencies.lineups = {
      outcome: lineupsResult.outcome,
      availability: lineupsResult.availability,
      reason: lineupsResult.reason,
      fetchedAt: new Date().toISOString(),
      rowCount: lineupsCount,
    };
  } else if (!options.skipLineups) {
    dependencies.lineups = dependencyRecordFromFetch({
      dependency: "lineups",
      fixtureStatus: context.status,
      kickoffAt: context.kickoffAt,
      supported: false,
      fetchOutcome: "SKIPPED",
      reason: "lineups_not_supported_for_competition",
      rowCount: 0,
    });
  }

  const playersFetch = await (async () => {
    await throttleProviderRequest();
    apiRequests += 1;
    return fetchFixtureResource(
      `fixture ${fixtureProviderId} players`,
      "player_performances",
      {
        fixtureStatus: context.status,
        kickoffAt: context.kickoffAt,
        supported: competitionSupportsPlayerPerformances(competition),
      },
      () => getFixturePlayersEndpoint(fixtureProviderId)
    );
  })();

  let playerPerformancesCount = 0;
  if (
    playersFetch.outcome === "SUCCESS" &&
    playersFetch.value &&
    playersFetch.rowCount > 0
  ) {
    const lock = await withFixtureMatchDetailsLock(fixtureProviderId, () =>
      upsertPlayerMatchPerformances(
        client,
        context.fixtureUuid,
        playersFetch.value!,
        writePolicyForAvailability(
          playersFetch.availability,
          playersFetch.rowCount
        )
      )
    );
    if (!lock.acquired) {
      dependencies.player_performances = {
        outcome: "RETRYABLE_FAILURE",
        reason: lock.reason,
        fetchedAt: new Date().toISOString(),
        rowCount: 0,
      };
    } else {
      playerPerformancesCount = lock.value;
      await writeCachedValue(
        providerFixturePlayersKey(fixtureProviderId),
        playersFetch.value,
        CACHE_TTL.fixtureStatsStale
      );
    }
  }

  if (!dependencies.player_performances) {
    dependencies.player_performances = dependencyRecordFromFetch({
      dependency: "player_performances",
      fixtureStatus: context.status,
      kickoffAt: context.kickoffAt,
      supported: competitionSupportsPlayerPerformances(competition),
      fetchOutcome: playersFetch.outcome,
      reason: playersFetch.reason,
      rowCount: playerPerformancesCount,
      availability: playersFetch.availability,
    });
  }

  const state = buildFixtureMatchIngestionState(dependencies);
  await persistMatchIngestionState(client, context.fixtureUuid, state);

  const outcome = state.aggregate;
  const reason = mergeReasons(Object.values(dependencies));

  return {
    ok: ingestionOutcomeToOk(outcome),
    outcome,
    fixtureProviderId,
    stats: {
      events: eventsCount,
      statistics: statisticsCount,
      lineups: lineupsCount,
      playerPerformances: playerPerformancesCount,
      apiRequests,
    },
    reason,
    ingestionState: state,
  };
}

export async function ingestFixturePlayerPerformancesFromProvider(
  fixtureProviderId: number
): Promise<{ ok: boolean; playerPerformances: number; reason?: string }> {
  const client = createAdminClient();
  const context = await getFixtureIngestContext(client, fixtureProviderId);

  if (!context) {
    return {
      ok: false,
      playerPerformances: 0,
      reason: "Fixture not found in Postgres",
    };
  }

  const competition =
    context.leagueProviderId != null
      ? findCompetition(context.leagueProviderId)
      : undefined;

  if (!competitionSupportsPlayerPerformances(competition)) {
    return {
      ok: true,
      playerPerformances: 0,
      reason: "Player performances not supported for competition",
    };
  }

  await throttleProviderRequest();
  const playersFetch = await fetchFixtureResource(
    `fixture ${fixtureProviderId} players`,
    "player_performances",
    {
      fixtureStatus: context.status,
      kickoffAt: context.kickoffAt,
      supported: true,
    },
    () => getFixturePlayersEndpoint(fixtureProviderId)
  );

  if (playersFetch.outcome !== "SUCCESS") {
    return {
      ok: false,
      playerPerformances: 0,
      reason: playersFetch.reason,
    };
  }

  if (
    !playersFetch.value ||
    !shouldPersistResourceWrite(
      playersFetch.availability,
      playersFetch.rowCount
    ) ||
    playersFetch.rowCount === 0
  ) {
    return {
      ok: true,
      playerPerformances: 0,
      reason: playersFetch.reason,
    };
  }

  const lock = await withFixtureMatchDetailsLock(fixtureProviderId, () =>
    upsertPlayerMatchPerformances(
      client,
      context.fixtureUuid,
      playersFetch.value!,
      writePolicyForAvailability(
        playersFetch.availability,
        playersFetch.rowCount
      )
    )
  );

  if (!lock.acquired) {
    return {
      ok: false,
      playerPerformances: 0,
      reason: lock.reason,
    };
  }

  await writeCachedValue(
    providerFixturePlayersKey(fixtureProviderId),
    playersFetch.value,
    CACHE_TTL.fixtureStatsStale
  );

  return { ok: true, playerPerformances: lock.value };
}
