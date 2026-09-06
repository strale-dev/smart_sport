import { LockNotAcquiredError, withRenewableLock } from "@/lib/redis/lock";
import { predictionPrematchLockKey } from "@/lib/redis/keys";
import {
  buildPrematchFeatures,
  scorePrematchFromFeatures,
} from "@/lib/models/features";
import {
  getActiveModelVersion,
  insertPrematchPrediction,
  mapPredictionRowToResult,
  readLatestPrematchPrediction,
  resolveFixtureUuidByExternalId,
} from "@/lib/predictions/db";
import { PREMATCH_FRESHNESS_MS } from "@/lib/models/version";
import type { PrematchPredictionResult } from "@/types/prediction";

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
