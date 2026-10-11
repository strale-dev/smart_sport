import { buildLiveDetectorSnapshot } from "@/lib/live/detector-snapshot";
import type { LiveProbabilityDeltaResponse } from "@/lib/live/live-probability-delta";
import { isLivePollingEnabled } from "@/lib/env";
import { isLiveFixtureStatus } from "@/lib/fixtures/live-status";
import {
  getActiveModelVersion,
  mapLivePredictionRowToResult,
  mapPrematchPredictionRowForFixture,
  readLatestLivePrediction,
  readLatestPrematchPrediction,
  readOfficialPrematchPrediction,
  resolveLiveFixtureStateByExternalId,
} from "@/lib/predictions/db";
import {
  buildLivePredictionSourceSnapshot,
  type LivePredictionUnavailableReason,
  validateLivePredictionResult,
} from "@/lib/predictions/live-prediction-validation";
import { updateLiveProbability } from "@/lib/services/predictionService";
import type {
  LivePredictionResult,
  PrematchPredictionResult,
} from "@/types/prediction";

function toPrematchDeltaSnapshot(result: PrematchPredictionResult) {
  return {
    presentationKind: "PRE_MATCH_PROBABILITY" as const,
    modelTier: result.modelTier,
    expectedGoalsAvailable: result.expectedGoalsAvailable,
    winProbabilities: result.winProbabilities,
    expectedGoalsHome: result.expectedGoalsHome,
    expectedGoalsAway: result.expectedGoalsAway,
    expectedGoalsTotal: result.expectedGoalsTotal,
    expectedGoalsTotalMin: result.expectedGoalsTotalMin,
    expectedGoalsTotalMax: result.expectedGoalsTotalMax,
    over2Prob: result.over2Prob,
    over3Prob: result.over3Prob,
    under2Prob: result.under2Prob,
    bttsProb: result.bttsProb,
    weakerTeamScoringProb: result.weakerTeamScoringProb,
    confidence: result.confidence,
    predictedOutcome: result.predictedOutcome,
    predictionId: result.predictionId,
    modelVersion: result.modelVersion,
    createdAt: result.createdAt,
  };
}

function toLiveDeltaSnapshot(result: LivePredictionResult) {
  return {
    presentationKind: "LIVE_PROBABILITY" as const,
    expectedGoalsAvailable:
      result.inputSnapshot.xgHome != null ||
      result.inputSnapshot.xgAway != null,
    winProbabilities: result.winProbabilities,
    expectedGoalsHome: result.expectedGoalsHome,
    expectedGoalsAway: result.expectedGoalsAway,
    expectedGoalsTotal: result.expectedGoalsTotal,
    expectedGoalsTotalMin: result.expectedGoalsTotalMin,
    expectedGoalsTotalMax: result.expectedGoalsTotalMax,
    over2Prob: result.over2Prob,
    over3Prob: result.over3Prob,
    under2Prob: result.under2Prob,
    bttsProb: result.bttsProb,
    weakerTeamScoringProb: result.weakerTeamScoringProb,
    confidence: result.confidence,
    predictedOutcome: result.predictedOutcome,
    predictionId: result.predictionId,
    liveSnapshotId: result.liveSnapshotId,
    modelVersion: result.modelVersion,
    createdAt: result.createdAt,
  };
}

async function tryRecomputeLivePrediction(
  fixtureExternalId: number
): Promise<LivePredictionResult | null> {
  if (!isLivePollingEnabled()) {
    return null;
  }

  const snapshot = await buildLiveDetectorSnapshot(fixtureExternalId);
  if (!snapshot) {
    return null;
  }

  return updateLiveProbability({
    fixtureExternalId,
    snapshot,
  });
}

export async function resolveLiveProbabilityDelta(
  fixtureExternalId: number
): Promise<
  | { ok: false; error: "FIXTURE_NOT_FOUND" | "INVALID_FIXTURE_ID" }
  | { ok: true; body: LiveProbabilityDeltaResponse }
> {
  const fixture = await resolveLiveFixtureStateByExternalId(fixtureExternalId);
  if (!fixture) {
    return { ok: false, error: "FIXTURE_NOT_FOUND" };
  }

  const modelVersion = await getActiveModelVersion();
  const kickoffReached = Date.now() >= new Date(fixture.kickoff_at).getTime();
  const [prematchRow, liveRow] = await Promise.all([
    kickoffReached
      ? readOfficialPrematchPrediction(fixture.id, fixture.kickoff_at)
      : readLatestPrematchPrediction(fixture.id),
    readLatestLivePrediction(fixture.id),
  ]);

  const prematchResult = prematchRow
    ? await mapPrematchPredictionRowForFixture(
        prematchRow,
        fixtureExternalId,
        modelVersion.version,
        true
      )
    : null;

  let liveResult: LivePredictionResult | null = liveRow
    ? mapLivePredictionRowToResult(
        liveRow,
        fixtureExternalId,
        modelVersion.version,
        true
      )
    : null;

  let liveAvailable = false;
  let unavailableReason: LivePredictionUnavailableReason | null = null;
  let sourceSnapshot: LiveProbabilityDeltaResponse["sourceSnapshot"] = null;

  const fixtureForValidation = {
    fixtureExternalId,
    status: fixture.status,
    minute: fixture.minute,
    scoreHome: fixture.scoreHome,
    scoreAway: fixture.scoreAway,
  };

  if (liveResult && isLiveFixtureStatus(fixture.status)) {
    const validated = validateLivePredictionResult({
      fixture: fixtureForValidation,
      prediction: liveResult,
    });
    if (validated.ok) {
      liveAvailable = true;
      sourceSnapshot = validated.sourceSnapshot;
    } else {
      unavailableReason = validated.reason;
      const recomputed = await tryRecomputeLivePrediction(fixtureExternalId);
      if (recomputed) {
        const revalidated = validateLivePredictionResult({
          fixture: fixtureForValidation,
          prediction: recomputed,
        });
        if (revalidated.ok) {
          liveResult = recomputed;
          liveAvailable = true;
          unavailableReason = null;
          sourceSnapshot = revalidated.sourceSnapshot;
        } else {
          liveResult = null;
          unavailableReason = revalidated.reason;
        }
      } else {
        liveResult = null;
        if (
          !isLivePollingEnabled() &&
          unavailableReason !== "FIXTURE_ID_MISMATCH"
        ) {
          unavailableReason = "LIVE_POLLING_DISABLED";
        }
      }
    }
  } else if (isLiveFixtureStatus(fixture.status) && !liveResult) {
    unavailableReason = "NO_LIVE_PREDICTION";
    const recomputed = await tryRecomputeLivePrediction(fixtureExternalId);
    if (recomputed) {
      const revalidated = validateLivePredictionResult({
        fixture: fixtureForValidation,
        prediction: recomputed,
      });
      if (revalidated.ok) {
        liveResult = recomputed;
        liveAvailable = true;
        unavailableReason = null;
        sourceSnapshot = revalidated.sourceSnapshot;
      } else {
        unavailableReason = revalidated.reason;
      }
    } else if (!isLivePollingEnabled()) {
      unavailableReason = "LIVE_POLLING_DISABLED";
    }
  } else if (liveResult && !isLiveFixtureStatus(fixture.status)) {
    liveAvailable = true;
    sourceSnapshot = buildLivePredictionSourceSnapshot(liveResult);
  }

  const body: LiveProbabilityDeltaResponse = {
    prematch: prematchResult?.winProbabilities ?? null,
    prematchKind: prematchResult ? "PRE_MATCH_PROBABILITY" : null,
    live: liveAvailable ? (liveResult?.winProbabilities ?? null) : null,
    liveKind: liveAvailable ? "LIVE_PROBABILITY" : null,
    liveMinute: liveAvailable ? (liveResult?.minute ?? null) : null,
    liveAvailable,
    unavailableReason,
    sourceSnapshot,
    prematchPrediction: prematchResult
      ? toPrematchDeltaSnapshot(prematchResult)
      : null,
    livePrediction:
      liveAvailable && liveResult ? toLiveDeltaSnapshot(liveResult) : null,
  };

  return { ok: true, body };
}
