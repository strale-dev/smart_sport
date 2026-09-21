import { readLatestLiveInsight } from "@/lib/ai/db";
import { LIVE_STATUSES } from "@/lib/ai/status-map";
import {
  buildLiveDetectorSnapshot,
  readDetectorSnapshot,
  writeDetectorSnapshot,
} from "@/lib/live/detector-snapshot";
import type { MeaningfulEventBroadcastPayload } from "@/lib/live/event-detector-types";
import type { LiveDetectorSnapshot } from "@/lib/live/event-detector-types";
import { ingestLiveFixtureTick } from "@/lib/live/ingest-live-tick";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";
import {
  runMeaningfulEventPipeline,
  type MeaningfulEventPipelineResult,
} from "@/lib/live/meaningful-event-pipeline";
import { resolveFixtureUuidByExternalId } from "@/lib/predictions/db";
import type { FixtureStatus } from "@/types/domain";

export type FixtureLiveIngestPipelineResult = {
  changed: boolean;
  syncedAt?: string;
  prevSnapshot: LiveDetectorSnapshot | null;
  nextSnapshot: LiveDetectorSnapshot | null;
  pipelineResult: MeaningfulEventPipelineResult | null;
  meaningfulEvents?: MeaningfulEventBroadcastPayload[];
  snapshot?: MatchLiveSnapshot;
};

function isLiveStatus(status: string): boolean {
  return LIVE_STATUSES.has(status as FixtureStatus);
}

async function shouldRecoverBaselineOnUnchangedTick(
  fixtureProviderId: number,
  snapshot: LiveDetectorSnapshot
): Promise<boolean> {
  if (!isLiveStatus(snapshot.status)) {
    return false;
  }

  const fixture = await resolveFixtureUuidByExternalId(fixtureProviderId);
  if (!fixture) {
    return false;
  }

  const latestLiveInsight = await readLatestLiveInsight(fixture.id);
  return latestLiveInsight == null;
}

function logPipelineOutcome(
  fixtureProviderId: number,
  pipelineResult: MeaningfulEventPipelineResult,
  prevSnapshot: LiveDetectorSnapshot | null,
  nextSnapshot: LiveDetectorSnapshot
): void {
  if (pipelineResult.detectResult.scoreGoalMismatch) {
    console.warn(
      JSON.stringify({
        scope: "live/meaningful-event-detector",
        level: "warn",
        message: "score_goal_event_count_mismatch",
        fixtureProviderId,
        mismatch: pipelineResult.detectResult.scoreGoalMismatch,
        prevScore: prevSnapshot?.score ?? null,
        nextScore: nextSnapshot.score,
      })
    );
  }

  if (pipelineResult.broadcastEvents.length > 0) {
    console.info(
      JSON.stringify({
        scope: "live/meaningful-event-detector",
        level: "info",
        message: "meaningful_events_detected",
        fixtureProviderId,
        events: pipelineResult.broadcastEvents,
        livePredictionUpdated: pipelineResult.livePredictionUpdated,
        liveInsightGenerated: pipelineResult.liveInsightGenerated,
        liveInsightSkipReason: pipelineResult.liveInsightSkipReason ?? null,
      })
    );
  }
}

export async function runFixtureLiveIngestAndPipeline(
  fixtureProviderId: number
): Promise<FixtureLiveIngestPipelineResult> {
  const prevSnapshot = await readDetectorSnapshot(fixtureProviderId);
  const ingestResult = await ingestLiveFixtureTick(fixtureProviderId);

  if (!ingestResult.ok) {
    return {
      changed: false,
      prevSnapshot,
      nextSnapshot: null,
      pipelineResult: null,
      snapshot: ingestResult.snapshot,
    };
  }

  if (!ingestResult.changed) {
    const nextSnapshot = await buildLiveDetectorSnapshot(fixtureProviderId);
    if (
      nextSnapshot &&
      (await shouldRecoverBaselineOnUnchangedTick(
        fixtureProviderId,
        nextSnapshot
      ))
    ) {
      const pipelineResult = await runMeaningfulEventPipeline({
        fixtureProviderId,
        prevSnapshot,
        nextSnapshot,
      });

      logPipelineOutcome(
        fixtureProviderId,
        pipelineResult,
        prevSnapshot,
        nextSnapshot
      );

      if (pipelineResult.liveInsightGenerated) {
        await writeDetectorSnapshot(nextSnapshot);
      }

      return {
        changed: false,
        syncedAt: ingestResult.syncedAt,
        prevSnapshot,
        nextSnapshot,
        pipelineResult,
        meaningfulEvents:
          pipelineResult.broadcastEvents.length > 0
            ? pipelineResult.broadcastEvents
            : undefined,
        snapshot: ingestResult.snapshot,
      };
    }

    return {
      changed: false,
      prevSnapshot,
      nextSnapshot: null,
      pipelineResult: null,
      snapshot: ingestResult.snapshot,
    };
  }

  const syncedAt = ingestResult.syncedAt ?? new Date().toISOString();
  const nextSnapshot = await buildLiveDetectorSnapshot(fixtureProviderId);

  if (!nextSnapshot) {
    return {
      changed: true,
      syncedAt,
      prevSnapshot,
      nextSnapshot: null,
      pipelineResult: null,
      snapshot: ingestResult.snapshot,
    };
  }

  const pipelineResult = await runMeaningfulEventPipeline({
    fixtureProviderId,
    prevSnapshot,
    nextSnapshot,
  });

  logPipelineOutcome(
    fixtureProviderId,
    pipelineResult,
    prevSnapshot,
    nextSnapshot
  );

  await writeDetectorSnapshot(nextSnapshot);

  return {
    changed: true,
    syncedAt,
    prevSnapshot,
    nextSnapshot,
    pipelineResult,
    meaningfulEvents:
      pipelineResult.broadcastEvents.length > 0
        ? pipelineResult.broadcastEvents
        : undefined,
    snapshot: ingestResult.snapshot,
  };
}
