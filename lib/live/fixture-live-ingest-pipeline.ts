import {
  buildLiveDetectorSnapshot,
  readDetectorSnapshot,
  writeDetectorSnapshot,
} from "@/lib/live/detector-snapshot";
import { ingestLiveFixtureTick } from "@/lib/live/ingest-live-tick";
import { runMeaningfulEventPipeline } from "@/lib/live/meaningful-event-pipeline";
import type { MeaningfulEventBroadcastPayload } from "@/lib/live/event-detector-types";
import type { MeaningfulEventPipelineResult } from "@/lib/live/meaningful-event-pipeline";
import type { LiveDetectorSnapshot } from "@/lib/live/event-detector-types";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";

export type FixtureLiveIngestPipelineResult = {
  changed: boolean;
  syncedAt?: string;
  prevSnapshot: LiveDetectorSnapshot | null;
  nextSnapshot: LiveDetectorSnapshot | null;
  pipelineResult: MeaningfulEventPipelineResult | null;
  meaningfulEvents?: MeaningfulEventBroadcastPayload[];
  snapshot?: MatchLiveSnapshot;
};

export async function runFixtureLiveIngestAndPipeline(
  fixtureProviderId: number
): Promise<FixtureLiveIngestPipelineResult> {
  const prevSnapshot = await readDetectorSnapshot(fixtureProviderId);
  const ingestResult = await ingestLiveFixtureTick(fixtureProviderId);

  if (!ingestResult.ok || !ingestResult.changed) {
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
      })
    );
  }

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
