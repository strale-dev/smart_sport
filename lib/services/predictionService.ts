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
  readOfficialPrematchPrediction,
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
import {
  hasMinimumModelSignal,
  PREMATCH_SCHEDULED_LEAD_MS,
} from "@/lib/ai/prematch-availability";
import { computePrematchFeatureFingerprint } from "@/lib/models/prematch-feature-fingerprint";
import { isGenericBaselineWinProbabilities } from "@/lib/models/prematch-model-signal";
import type { PrematchFeatureVector } from "@/types/prediction";

const PREMATCH_STATUSES = new Set(["NS", "TBD"]);

function isKickoffReached(kickoffAt: string, now = Date.now()): boolean {
  return now >= new Date(kickoffAt).getTime();
}

async function readPrematchRowForFixture(fixture: {
  id: string;
  kickoff_at: string;
  status: string;
}): Promise<Awaited<ReturnType<typeof readLatestPrematchPrediction>>> {
  if (
    isKickoffReached(fixture.kickoff_at) ||
    !PREMATCH_STATUSES.has(fixture.status)
  ) {
    const official = await readOfficialPrematchPrediction(
      fixture.id,
      fixture.kickoff_at
    );
    if (official) {
      return official;
    }
  }

  return readLatestPrematchPrediction(fixture.id);
}
const LOCK_TTL_SECONDS = 45;
const LOCK_RENEW_INTERVAL_MS = 10_000;
const LOCK_WAIT_ATTEMPTS = 8;
const LOCK_WAIT_MS = 250;

function isFreshPrediction(createdAt: string, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() < PREMATCH_FRESHNESS_MS;
}

function isPrematchComputeWindowOpen(
  kickoffAt: string,
  now = Date.now()
): boolean {
  return new Date(kickoffAt).getTime() - now <= PREMATCH_SCHEDULED_LEAD_MS;
}

async function storedPredictionMatchesCurrentFeatures(input: {
  fixtureExternalId: number;
  storedSnapshot: PrematchFeatureVector;
}): Promise<boolean> {
  const current = await buildPrematchFeatures(input.fixtureExternalId, {
    fixtureExternalId: input.fixtureExternalId,
  });
  if (!current) {
    return false;
  }

  return (
    computePrematchFeatureFingerprint(current) ===
    computePrematchFeatureFingerprint(input.storedSnapshot)
  );
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
  const fixtureMeta = await resolveFixtureUuidByExternalId(fixtureExternalId);
  if (fixtureMeta && isKickoffReached(fixtureMeta.kickoff_at)) {
    const frozen = await readOfficialPrematchPrediction(
      fixtureUuid,
      fixtureMeta.kickoff_at
    );
    if (frozen) {
      const modelVersion = await getActiveModelVersion();
      return mapPredictionRowToResult(
        frozen,
        fixtureExternalId,
        modelVersion.version,
        true
      );
    }
    throw new Error(
      `No official prematch prediction for fixture ${fixtureExternalId} after kickoff`
    );
  }

  const { evaluateFixtureReadinessForProvider, isFixtureReadyForPrediction } =
    await import("@/lib/fixtures/readiness");
  const readiness =
    await evaluateFixtureReadinessForProvider(fixtureExternalId);
  if (!readiness || !isFixtureReadyForPrediction(readiness)) {
    throw new Error(
      `Fixture ${fixtureExternalId} not ready for prematch prediction`
    );
  }

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
    expectedGoalsTotal: output.expectedGoalsTotal,
    expectedGoalsTotalMin: output.expectedGoalsTotalMin,
    expectedGoalsTotalMax: output.expectedGoalsTotalMax,
    over2Prob: output.over2Prob,
    over3Prob: output.over3Prob,
    bttsProb: output.bttsProb,
    weakerTeamScoringProb: output.weakerTeamScoringProb,
    confidence: output.confidence,
    inputSnapshot: features,
  });

  const result = mapPredictionRowToResult(
    row,
    fixtureExternalId,
    modelVersion.version,
    false
  );

  try {
    const { evaluateAndPersistFixtureReadiness } =
      await import("@/lib/fixtures/readiness");
    await evaluateAndPersistFixtureReadiness({ providerId: fixtureExternalId });
  } catch (error) {
    console.warn(
      `[predictionService] readiness refresh failed for ${fixtureExternalId}`,
      error
    );
  }

  return result;
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

  const snapshot = latest.input_snapshot as PrematchFeatureVector;
  const fingerprintMatches = await storedPredictionMatchesCurrentFeatures({
    fixtureExternalId,
    storedSnapshot: snapshot,
  });
  if (!fingerprintMatches) {
    return null;
  }

  const mapped = mapPredictionRowToResult(
    latest,
    fixtureExternalId,
    modelVersion ?? "1.0.0",
    true
  );

  if (
    isGenericBaselineWinProbabilities(mapped.winProbabilities) &&
    hasMinimumModelSignal(snapshot)
  ) {
    return null;
  }

  return mapped;
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

  if (
    !PREMATCH_STATUSES.has(fixture.status) ||
    isKickoffReached(fixture.kickoff_at)
  ) {
    const row = await readPrematchRowForFixture(fixture);
    if (row) {
      return mapPredictionRowToResult(
        row,
        fixtureExternalId,
        modelVersion.version,
        true
      );
    }

    return null;
  }

  if (!isPrematchComputeWindowOpen(fixture.kickoff_at)) {
    return null;
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
  const row = await readPrematchRowForFixture(fixture);
  if (!row) {
    return null;
  }

  return mapPredictionRowToResult(
    row,
    fixtureExternalId,
    modelVersion.version,
    true
  );
}

/** Pre-kickoff audit snapshot (last PREMATCH row before kickoff_at). */
export async function getOfficialPrematch(
  fixtureExternalId: number
): Promise<PrematchPredictionResult | null> {
  const fixture = await resolveFixtureUuidByExternalId(fixtureExternalId);
  if (!fixture) {
    return null;
  }

  const modelVersion = await getActiveModelVersion();
  const row = await readOfficialPrematchPrediction(
    fixture.id,
    fixture.kickoff_at
  );
  if (!row) {
    return null;
  }

  return mapPredictionRowToResult(
    row,
    fixtureExternalId,
    modelVersion.version,
    true
  );
}

/** Fixed pre-kickoff anchor for live scoring — never the latest LIVE row (RC-12). */
export async function resolveLiveAnchorWinProbabilities(
  fixtureExternalId: number
): Promise<WinProbabilities | null> {
  const official = await getOfficialPrematch(fixtureExternalId);
  if (official) {
    return official.winProbabilities;
  }

  const prematch = await getOrComputePrematch(fixtureExternalId);
  return prematch?.winProbabilities ?? null;
}

export async function updateLiveProbability(input: {
  fixtureExternalId: number;
  snapshot: LiveDetectorSnapshot;
}): Promise<LivePredictionResult | null> {
  const fixture = await resolveFixtureUuidByExternalId(input.fixtureExternalId);
  if (!fixture) {
    return null;
  }

  const { isPausedLiveFixtureStatus } =
    await import("@/lib/fixtures/live-status");
  if (isPausedLiveFixtureStatus(fixture.status)) {
    return null;
  }

  const anchor = await resolveLiveAnchorWinProbabilities(
    input.fixtureExternalId
  );
  if (!anchor) {
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
        const anchorInsideLock = await resolveLiveAnchorWinProbabilities(
          input.fixtureExternalId
        );
        if (!anchorInsideLock) {
          return null;
        }

        const features = buildLiveFeaturesFromSnapshot(
          input.snapshot,
          anchorInsideLock
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
          expectedGoalsTotal: output.expectedGoalsTotal,
          expectedGoalsTotalMin: output.expectedGoalsTotalMin,
          expectedGoalsTotalMax: output.expectedGoalsTotalMax,
          over2Prob: output.over2Prob,
          over3Prob: output.over3Prob,
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
