import { LockNotAcquiredError, withRenewableLock } from "@/lib/redis/lock";
import {
  predictionLiveLockKey,
  predictionPrematchLockKey,
} from "@/lib/redis/keys";
import { buildLiveFeaturesFromSnapshot } from "@/lib/models/live-features";
import { scoreLiveFromFeatures } from "@/lib/models/liveProbability";
import type { LiveDetectorSnapshot } from "@/lib/live/event-detector-types";
import {
  getActiveModelVersion,
  insertLivePrediction,
  insertPrematchPrediction,
  mapLivePredictionRowToResult,
  mapPredictionRowToResult,
  readLatestLivePrediction,
  readLatestPrematchPrediction,
  resolveFixtureUuidByExternalId,
} from "@/lib/predictions/db";
import { PREMATCH_FRESHNESS_MS } from "@/lib/models/version";
import type {
  LivePredictionResult,
  PrematchPredictionResult,
  WinProbabilities,
} from "@/types/prediction";
import {
  buildPrematchFeatures,
  scorePrematchFromFeatures,
} from "@/lib/models/features";

const PREMATCH_STATUSES = new Set(["NS", "TBD"]);
const LOCK_TTL_SECONDS = 45;
const LOCK_RENEW_INTERVAL_MS = 10_000;
const LOCK_WAIT_ATTEMPTS = 8;
const LOCK_WAIT_MS = 250;

function isFreshPrediction(createdAt: string, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() < PREMATCH_FRESHNESS_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function computeAndPersistPrematch(
  fixtureExternalId: number,
  fixtureUuid: string
): Promise<PrematchPredictionResult> {
  const modelVersion = await getActiveModelVersion();
  const features = await buildPrematchFeatures(fixtureExternalId, {
    fixtureExternalId,
  });

  if (!features) {
    throw new Error(
      `Unable to build features for fixture ${fixtureExternalId}`
    );
  }

  const output = scorePrematchFromFeatures(features, modelVersion.coefficients);
  const row = await insertPrematchPrediction({
    fixtureUuid,
    modelVersionId: modelVersion.id,
    fixtureExternalId,
    modelVersion: modelVersion.version,
    homeWinProb: output.winProbabilities.home,
    drawProb: output.winProbabilities.draw,
    awayWinProb: output.winProbabilities.away,
    expectedGoalsHome: output.expectedGoalsHome,
    expectedGoalsAway: output.expectedGoalsAway,
    expectedGoalsTotalMin: output.expectedGoalsTotalMin,
    expectedGoalsTotalMax: output.expectedGoalsTotalMax,
    bttsProb: output.bttsProb,
    weakerTeamScoringProb: output.weakerTeamScoringProb,
    confidence: output.confidence,
    inputSnapshot: features,
  });

  return mapPredictionRowToResult(
    row,
    fixtureExternalId,
    modelVersion.version,
    false
  );
}

async function readFreshPrematch(
  fixtureUuid: string,
  fixtureExternalId: number,
  modelVersion?: string
): Promise<PrematchPredictionResult | null> {
  const latest = await readLatestPrematchPrediction(fixtureUuid);
  if (!latest || !isFreshPrediction(latest.created_at)) {
    return null;
  }

  return mapPredictionRowToResult(
    latest,
    fixtureExternalId,
    modelVersion ?? "1.0.0",
    true
  );
}

async function waitForConcurrentPrediction(
  fixtureUuid: string,
  fixtureExternalId: number
): Promise<PrematchPredictionResult | null> {
  for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt += 1) {
    const cached = await readFreshPrematch(fixtureUuid, fixtureExternalId);
    if (cached) {
      return cached;
    }
    await sleep(LOCK_WAIT_MS);
  }
  return null;
}

export async function getOrComputePrematch(
  fixtureExternalId: number
): Promise<PrematchPredictionResult | null> {
  const fixture = await resolveFixtureUuidByExternalId(fixtureExternalId);
  if (!fixture) {
    return null;
  }

  const modelVersion = await getActiveModelVersion();
  const cached = await readFreshPrematch(
    fixture.id,
    fixtureExternalId,
    modelVersion.version
  );
  if (cached) {
    return cached;
  }

  if (!PREMATCH_STATUSES.has(fixture.status)) {
    const latest = await readLatestPrematchPrediction(fixture.id);
    if (!latest) {
      return null;
    }
    return mapPredictionRowToResult(
      latest,
      fixtureExternalId,
      modelVersion.version,
      true
    );
  }

  const lockKey = predictionPrematchLockKey(fixtureExternalId);

  try {
    return await withRenewableLock(
      lockKey,
      LOCK_TTL_SECONDS,
      LOCK_RENEW_INTERVAL_MS,
      async () => {
        const freshInsideLock = await readFreshPrematch(
          fixture.id,
          fixtureExternalId,
          modelVersion.version
        );
        if (freshInsideLock) {
          return freshInsideLock;
        }

        return computeAndPersistPrematch(fixtureExternalId, fixture.id);
      }
    );
  } catch (error) {
    if (!(error instanceof LockNotAcquiredError)) {
      throw error;
    }

    const concurrent = await waitForConcurrentPrediction(
      fixture.id,
      fixtureExternalId
    );
    if (concurrent) {
      return concurrent;
    }

    throw new Error(
      `Timed out waiting for prematch prediction on fixture ${fixtureExternalId}`
    );
  }
}

export async function getLatestPrematch(
  fixtureExternalId: number
): Promise<PrematchPredictionResult | null> {
  const fixture = await resolveFixtureUuidByExternalId(fixtureExternalId);
  if (!fixture) {
    return null;
  }

  const modelVersion = await getActiveModelVersion();
  const latest = await readLatestPrematchPrediction(fixture.id);
  if (!latest) {
    return null;
  }

  return mapPredictionRowToResult(
    latest,
    fixtureExternalId,
    modelVersion.version,
    true
  );
}

async function resolvePriorWinProbabilities(
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

export async function updateLiveProbability(input: {
  fixtureExternalId: number;
  snapshot: LiveDetectorSnapshot;
}): Promise<LivePredictionResult | null> {
  const fixture = await resolveFixtureUuidByExternalId(input.fixtureExternalId);
  if (!fixture) {
    return null;
  }

  let prior = await resolvePriorWinProbabilities(
    fixture.id,
    input.fixtureExternalId
  );
  if (!prior) {
    const prematch = await getOrComputePrematch(input.fixtureExternalId);
    prior = prematch?.winProbabilities ?? null;
  }

  if (!prior) {
    return null;
  }

  const lockKey = predictionLiveLockKey(input.fixtureExternalId);

  try {
    return await withRenewableLock(
      lockKey,
      LOCK_TTL_SECONDS,
      LOCK_RENEW_INTERVAL_MS,
      async () => {
        const modelVersion = await getActiveModelVersion();
        const priorInsideLock = await resolvePriorWinProbabilities(
          fixture.id,
          input.fixtureExternalId
        );
        if (!priorInsideLock) {
          return null;
        }

        const features = buildLiveFeaturesFromSnapshot(
          input.snapshot,
          priorInsideLock
        );
        const output = scoreLiveFromFeatures(features);

        const row = await insertLivePrediction({
          fixtureUuid: fixture.id,
          modelVersionId: modelVersion.id,
          fixtureExternalId: input.fixtureExternalId,
          modelVersion: modelVersion.version,
          minute: input.snapshot.minute,
          homeWinProb: output.winProbabilities.home,
          drawProb: output.winProbabilities.draw,
          awayWinProb: output.winProbabilities.away,
          expectedGoalsHome: output.expectedGoalsHome,
          expectedGoalsAway: output.expectedGoalsAway,
          expectedGoalsTotalMin: output.expectedGoalsTotalMin,
          expectedGoalsTotalMax: output.expectedGoalsTotalMax,
          bttsProb: output.bttsProb,
          weakerTeamScoringProb: output.weakerTeamScoringProb,
          confidence: output.confidence,
          inputSnapshot: features,
        });

        return mapLivePredictionRowToResult(
          row,
          input.fixtureExternalId,
          modelVersion.version,
          false
        );
      }
    );
  } catch (error) {
    if (error instanceof LockNotAcquiredError) {
      for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt += 1) {
        await sleep(LOCK_WAIT_MS);
        const latest = await readLatestLivePrediction(fixture.id);
        if (latest) {
          const modelVersion = await getActiveModelVersion();
          return mapLivePredictionRowToResult(
            latest,
            input.fixtureExternalId,
            modelVersion.version,
            true
          );
        }
      }
      return null;
    }

    throw error;
  }
}
