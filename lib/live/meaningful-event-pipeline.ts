import { readLatestLiveInsight } from "@/lib/ai/db";
import { LIVE_STATUSES } from "@/lib/ai/status-map";
import type {
  DetectedMeaningfulEvent,
  DetectResult,
  LiveDetectorSnapshot,
  MeaningfulEventBroadcastPayload,
  MeaningfulEventKind,
} from "@/lib/live/event-detector-types";
import {
  detectMeaningfulEvents,
  toMeaningfulEventBroadcastPayload,
} from "@/lib/live/eventDetector";
import {
  isLiveInsightGenerationInBackoff,
  markLiveInsightGenerationBackoff,
  readStoredLiveInsightContext,
  shouldRunPeriodicLiveInsight,
  snapshotLiveContext,
  writeStoredLiveInsightContext,
} from "@/lib/live/live-insight-schedule";
import {
  isProbabilityShiftMeaningful,
  LIVE_PROBABILITY_SHIFT_THRESHOLD,
} from "@/lib/live/probability-shift";
import { buildLiveFeaturesFromSnapshot } from "@/lib/models/live-features";
import { scoreLiveFromFeatures } from "@/lib/models/liveProbability";
import { generateLiveInsight } from "@/lib/services/aiService";
import {
  resolveLiveAnchorWinProbabilities,
  updateLiveProbability,
} from "@/lib/services/predictionService";
import { resolveFixtureUuidByExternalId } from "@/lib/predictions/db";
import type { FixtureStatus } from "@/types/domain";
import type { WinProbabilities } from "@/types/prediction";

export type MeaningfulEventPipelineResult = {
  detectResult: DetectResult;
  broadcastEvents: MeaningfulEventBroadcastPayload[];
  livePredictionUpdated: boolean;
  liveInsightGenerated: boolean;
  liveInsightSkipReason?: string | null;
};

function findTeamStat(snapshot: LiveDetectorSnapshot, teamExternalId: number) {
  return snapshot.stats.find(
    (entry) => entry.teamExternalId === teamExternalId
  );
}

export function buildLiveStatsFromSnapshot(snapshot: LiveDetectorSnapshot) {
  const homeStats = findTeamStat(snapshot, snapshot.homeTeamExternalId);
  const awayStats = findTeamStat(snapshot, snapshot.awayTeamExternalId);

  return {
    xgHome: homeStats?.expectedGoals ?? null,
    xgAway: awayStats?.expectedGoals ?? null,
    redCardsHome: homeStats?.redCards ?? 0,
    redCardsAway: awayStats?.redCards ?? 0,
    shotsTotalHome: homeStats?.shotsTotal ?? null,
    shotsTotalAway: awayStats?.shotsTotal ?? null,
    shotsOnTargetHome: homeStats?.shotsOnTarget ?? null,
    shotsOnTargetAway: awayStats?.shotsOnTarget ?? null,
    ballPossessionHome: homeStats?.ballPossession ?? null,
    ballPossessionAway: awayStats?.ballPossession ?? null,
  };
}

async function resolveBaselineProbabilities(
  _fixtureUuid: string,
  fixtureExternalId: number
): Promise<WinProbabilities | null> {
  return resolveLiveAnchorWinProbabilities(fixtureExternalId);
}

function appendProbabilityShiftEvent(
  events: DetectedMeaningfulEvent[],
  shift: number
): DetectedMeaningfulEvent[] {
  if (events.some((entry) => entry.kind === "PROBABILITY_SHIFT")) {
    return events;
  }

  return [
    ...events,
    {
      kind: "PROBABILITY_SHIFT",
      reason: "win_probability_shift",
      minute: null,
      teamExternalId: null,
      meta: {
        threshold: LIVE_PROBABILITY_SHIFT_THRESHOLD,
        maxShift: shift,
      },
    },
  ];
}

function appendSyntheticEvent(
  events: DetectedMeaningfulEvent[],
  kind: Extract<MeaningfulEventKind, "LIVE_BASELINE" | "HT" | "PERIODIC">,
  snapshot: LiveDetectorSnapshot
): DetectedMeaningfulEvent[] {
  if (events.some((entry) => entry.kind === kind)) {
    return events;
  }

  return [
    ...events,
    {
      kind,
      reason: kind.toLowerCase(),
      minute: snapshot.minute,
      teamExternalId: null,
    },
  ];
}

function isLiveSnapshotStatus(status: string): boolean {
  return LIVE_STATUSES.has(status as FixtureStatus);
}

async function resolveScheduledTriggers(input: {
  fixtureUuid: string;
  fixtureProviderId: number;
  prevSnapshot: LiveDetectorSnapshot | null;
  nextSnapshot: LiveDetectorSnapshot;
  events: DetectedMeaningfulEvent[];
}): Promise<DetectedMeaningfulEvent[]> {
  if (!isLiveSnapshotStatus(input.nextSnapshot.status)) {
    return input.events;
  }

  if (await isLiveInsightGenerationInBackoff(input.fixtureProviderId)) {
    return input.events;
  }

  const latestLiveInsight = await readLatestLiveInsight(input.fixtureUuid);
  let events = input.events;

  if (!latestLiveInsight) {
    return appendSyntheticEvent(events, "LIVE_BASELINE", input.nextSnapshot);
  }

  if (
    input.nextSnapshot.status === "HT" &&
    input.prevSnapshot?.status !== "HT"
  ) {
    events = appendSyntheticEvent(events, "HT", input.nextSnapshot);
  }

  const baseline = await resolveBaselineProbabilities(
    input.fixtureUuid,
    input.fixtureProviderId
  );
  if (baseline) {
    const features = buildLiveFeaturesFromSnapshot(
      input.nextSnapshot,
      baseline
    );
    const preview = scoreLiveFromFeatures(features);
    const storedContext = await readStoredLiveInsightContext(
      input.fixtureProviderId
    );

    if (
      shouldRunPeriodicLiveInsight({
        lastInsightCreatedAt: latestLiveInsight.created_at,
        storedContext,
        snapshot: input.nextSnapshot,
        previewProbabilities: preview.winProbabilities,
      })
    ) {
      events = appendSyntheticEvent(events, "PERIODIC", input.nextSnapshot);
    }
  }

  return events;
}

export async function runMeaningfulEventPipeline(input: {
  fixtureProviderId: number;
  prevSnapshot: LiveDetectorSnapshot | null;
  nextSnapshot: LiveDetectorSnapshot;
}): Promise<MeaningfulEventPipelineResult> {
  const detectResult = detectMeaningfulEvents(
    input.prevSnapshot,
    input.nextSnapshot
  );

  let events = [...detectResult.events];
  let shouldPersist = events.length > 0;

  const fixture = await resolveFixtureUuidByExternalId(input.fixtureProviderId);

  if (fixture) {
    events = await resolveScheduledTriggers({
      fixtureUuid: fixture.id,
      fixtureProviderId: input.fixtureProviderId,
      prevSnapshot: input.prevSnapshot,
      nextSnapshot: input.nextSnapshot,
      events,
    });

    if (events.length > 0) {
      shouldPersist = true;
    }

    if (input.prevSnapshot) {
      const baseline = await resolveBaselineProbabilities(
        fixture.id,
        input.fixtureProviderId
      );
      if (baseline) {
        const features = buildLiveFeaturesFromSnapshot(
          input.nextSnapshot,
          baseline
        );
        const preview = scoreLiveFromFeatures(features);
        const shift = Math.max(
          Math.abs(preview.winProbabilities.home - baseline.home),
          Math.abs(preview.winProbabilities.draw - baseline.draw),
          Math.abs(preview.winProbabilities.away - baseline.away)
        );

        if (isProbabilityShiftMeaningful(baseline, preview.winProbabilities)) {
          shouldPersist = true;
          events = appendProbabilityShiftEvent(events, shift);
        }
      }
    }
  }

  detectResult.events = events;

  const triggerKinds: MeaningfulEventKind[] = events.map((entry) => entry.kind);

  if (!shouldPersist) {
    return {
      detectResult,
      broadcastEvents: events.map(toMeaningfulEventBroadcastPayload),
      livePredictionUpdated: false,
      liveInsightGenerated: false,
      liveInsightSkipReason: null,
    };
  }

  const livePrediction = await updateLiveProbability({
    fixtureExternalId: input.fixtureProviderId,
    snapshot: input.nextSnapshot,
  });

  if (!livePrediction) {
    const skipReason = "NO_LIVE_BASELINE";
    console.error(
      JSON.stringify({
        scope: "live/meaningful-event-pipeline",
        level: "error",
        message: "live_prediction_unavailable",
        fixtureProviderId: input.fixtureProviderId,
        reason: skipReason,
        triggers: triggerKinds,
      })
    );
    return {
      detectResult,
      broadcastEvents: events.map(toMeaningfulEventBroadcastPayload),
      livePredictionUpdated: false,
      liveInsightGenerated: false,
      liveInsightSkipReason: skipReason,
    };
  }

  const insightResult = await generateLiveInsight({
    fixtureExternalId: input.fixtureProviderId,
    prediction: livePrediction,
    meaningfulTriggers: [...new Set(triggerKinds)],
    minute: input.nextSnapshot.minute,
    score: input.nextSnapshot.score,
    liveStats: buildLiveStatsFromSnapshot(input.nextSnapshot),
  });

  if (!insightResult.ok) {
    await markLiveInsightGenerationBackoff(input.fixtureProviderId);
    console.error(
      JSON.stringify({
        scope: "live/meaningful-event-pipeline",
        level: "error",
        message: "live_insight_generation_failed",
        fixtureProviderId: input.fixtureProviderId,
        reason: insightResult.reason,
        triggers: triggerKinds,
      })
    );
  } else if (!insightResult.cached) {
    await writeStoredLiveInsightContext(
      input.fixtureProviderId,
      snapshotLiveContext(input.nextSnapshot, livePrediction.winProbabilities)
    );
  }

  return {
    detectResult,
    broadcastEvents: events.map(toMeaningfulEventBroadcastPayload),
    livePredictionUpdated: true,
    liveInsightGenerated: insightResult.ok,
    liveInsightSkipReason: insightResult.ok ? null : insightResult.reason,
  };
}
