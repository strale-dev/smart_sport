import { isLiveFixtureStatus } from "@/lib/fixtures/live-status";
import type {
  LiveFeatureVector,
  LivePredictionResult,
} from "@/types/prediction";

export type LivePredictionUnavailableReason =
  | "FIXTURE_ID_MISMATCH"
  | "SCORE_MISMATCH"
  | "MINUTE_BEHIND"
  | "STATUS_MISMATCH"
  | "SCORE_UNAVAILABLE"
  | "NO_LIVE_PREDICTION"
  | "LIVE_POLLING_DISABLED";

export type LiveFixtureStateForValidation = {
  fixtureExternalId: number;
  status: string;
  minute: number | null;
  scoreHome: number | null;
  scoreAway: number | null;
};

export type LivePredictionSourceSnapshot = {
  fixtureExternalId: number;
  status: string;
  minute: number | null;
  scoreHome: number;
  scoreAway: number;
  liveSnapshotId: string;
  predictionId: string;
  predictionCreatedAt: string;
  contextHash: string;
};

const MINUTE_TOLERANCE = 2;

export function computeLivePredictionContextHash(
  snapshot: LiveFeatureVector
): string {
  return JSON.stringify({
    fixtureExternalId: snapshot.fixtureExternalId,
    minute: snapshot.minute,
    scoreHome: snapshot.scoreHome,
    scoreAway: snapshot.scoreAway,
    anchor: snapshot.anchorWinProbabilities,
  });
}

export function validateLiveFeatureSnapshotAgainstFixture(input: {
  fixture: LiveFixtureStateForValidation;
  snapshot: LiveFeatureVector;
}): { ok: true } | { ok: false; reason: LivePredictionUnavailableReason } {
  if (input.snapshot.fixtureExternalId !== input.fixture.fixtureExternalId) {
    return { ok: false, reason: "FIXTURE_ID_MISMATCH" };
  }

  if (!isLiveFixtureStatus(input.fixture.status)) {
    return { ok: false, reason: "STATUS_MISMATCH" };
  }

  if (input.fixture.scoreHome == null || input.fixture.scoreAway == null) {
    return { ok: false, reason: "SCORE_UNAVAILABLE" };
  }

  if (
    input.snapshot.scoreHome !== input.fixture.scoreHome ||
    input.snapshot.scoreAway !== input.fixture.scoreAway
  ) {
    return { ok: false, reason: "SCORE_MISMATCH" };
  }

  const fixtureMinute = input.fixture.minute;
  const snapshotMinute = input.snapshot.minute;
  if (
    fixtureMinute != null &&
    snapshotMinute != null &&
    snapshotMinute + MINUTE_TOLERANCE < fixtureMinute
  ) {
    return { ok: false, reason: "MINUTE_BEHIND" };
  }

  return { ok: true };
}

export function buildLivePredictionSourceSnapshot(
  prediction: LivePredictionResult
): LivePredictionSourceSnapshot {
  return {
    fixtureExternalId: prediction.fixtureExternalId,
    status: "LIVE",
    minute: prediction.minute,
    scoreHome: prediction.inputSnapshot.scoreHome,
    scoreAway: prediction.inputSnapshot.scoreAway,
    liveSnapshotId: prediction.liveSnapshotId,
    predictionId: prediction.predictionId,
    predictionCreatedAt: prediction.createdAt,
    contextHash: computeLivePredictionContextHash(prediction.inputSnapshot),
  };
}

export function validateLivePredictionResult(input: {
  fixture: LiveFixtureStateForValidation;
  prediction: LivePredictionResult;
}):
  | { ok: true; sourceSnapshot: LivePredictionSourceSnapshot }
  | { ok: false; reason: LivePredictionUnavailableReason } {
  const validated = validateLiveFeatureSnapshotAgainstFixture({
    fixture: input.fixture,
    snapshot: input.prediction.inputSnapshot,
  });
  if (!validated.ok) {
    return validated;
  }

  return {
    ok: true,
    sourceSnapshot: buildLivePredictionSourceSnapshot(input.prediction),
  };
}
