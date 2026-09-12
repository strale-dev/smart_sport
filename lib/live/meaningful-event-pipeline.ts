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
import { buildLiveFeaturesFromSnapshot } from "@/lib/models/live-features";
import { scoreLiveFromFeatures } from "@/lib/models/liveProbability";
import {
  isProbabilityShiftMeaningful,
  LIVE_PROBABILITY_SHIFT_THRESHOLD,
} from "@/lib/live/probability-shift";
import { generateLiveInsight } from "@/lib/services/aiService";
import { updateLiveProbability } from "@/lib/services/predictionService";
import {
  getActiveModelVersion,
  mapLivePredictionRowToResult,
  mapPredictionRowToResult,
  readLatestLivePrediction,
  readLatestPrematchPrediction,
  resolveFixtureUuidByExternalId,
} from "@/lib/predictions/db";
import type { WinProbabilities } from "@/types/prediction";

export type MeaningfulEventPipelineResult = {
  detectResult: DetectResult;
  broadcastEvents: MeaningfulEventBroadcastPayload[];
  livePredictionUpdated: boolean;
  liveInsightGenerated: boolean;
};

function findTeamStat(snapshot: LiveDetectorSnapshot, teamExternalId: number) {
  return snapshot.stats.find(
    (entry) => entry.teamExternalId === teamExternalId
  );
}

async function resolveBaselineProbabilities(
  fixtureUuid: string,
  fixtureExternalId: number
): Promise<WinProbabilities | null> {
  const modelVersion = await getActiveModelVersion();
  const latestLive = await readLatestLivePrediction(fixtureUuid);
  if (latestLive) {
    return mapLivePredictionRowToResult(
      latestLive,
      fixtureExternalId,
      modelVersion.version,
      true
    ).winProbabilities;
  }

  const prematch = await readLatestPrematchPrediction(fixtureUuid);
  if (!prematch) {
    return null;
  }

  return mapPredictionRowToResult(
    prematch,
    fixtureExternalId,
    modelVersion.version,
    true
  ).winProbabilities;
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

export async function runMeaningfulEventPipeline(input: {
  fixtureProviderId: number;
  prevSnapshot: LiveDetectorSnapshot | null;
  nextSnapshot: LiveDetectorSnapshot;
}): Promise<MeaningfulEventPipelineResult> {
  const detectResult = detectMeaningfulEvents(
    input.prevSnapshot,
    input.nextSnapshot
  );

  let triggerKinds: MeaningfulEventKind[] = detectResult.events.map(
    (entry) => entry.kind
  );
  let shouldPersist = detectResult.events.length > 0;

  if (input.prevSnapshot) {
    const fixture = await resolveFixtureUuidByExternalId(
      input.fixtureProviderId
    );
    if (fixture) {
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
          detectResult.events = appendProbabilityShiftEvent(
            detectResult.events,
            shift
          );
          triggerKinds = detectResult.events.map((entry) => entry.kind);
        }
      }
    }
  }

  if (!shouldPersist) {
    return {
      detectResult,
      broadcastEvents: detectResult.events.map(
        toMeaningfulEventBroadcastPayload
      ),
      livePredictionUpdated: false,
      liveInsightGenerated: false,
    };
  }

  const livePrediction = await updateLiveProbability({
    fixtureExternalId: input.fixtureProviderId,
    snapshot: input.nextSnapshot,
  });

  if (!livePrediction) {
    return {
      detectResult,
      broadcastEvents: detectResult.events.map(
        toMeaningfulEventBroadcastPayload
      ),
      livePredictionUpdated: false,
      liveInsightGenerated: false,
    };
  }

  const homeStats = findTeamStat(
    input.nextSnapshot,
    input.nextSnapshot.homeTeamExternalId
  );
  const awayStats = findTeamStat(
    input.nextSnapshot,
    input.nextSnapshot.awayTeamExternalId
  );

  const insightResult = await generateLiveInsight({
    fixtureExternalId: input.fixtureProviderId,
    prediction: livePrediction,
    meaningfulTriggers: [...new Set(triggerKinds)],
    minute: input.nextSnapshot.minute,
    score: input.nextSnapshot.score,
    liveStats: {
      xgHome: homeStats?.expectedGoals ?? null,
      xgAway: awayStats?.expectedGoals ?? null,
      redCardsHome: homeStats?.redCards ?? 0,
      redCardsAway: awayStats?.redCards ?? 0,
    },
  });

  return {
    detectResult,
    broadcastEvents: detectResult.events.map(toMeaningfulEventBroadcastPayload),
    livePredictionUpdated: true,
    liveInsightGenerated: insightResult.ok,
  };
}
