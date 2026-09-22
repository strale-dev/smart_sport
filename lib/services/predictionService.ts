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
import { PREMATCH_SCHEDULED_LEAD_MS } from "@/lib/ai/prematch-availability";
import { computePrematchFeatureFingerprint } from "@/lib/models/prematch-feature-fingerprint";
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
    return true;
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

  const snapshot = latest.input_snapshot as PrematchFeatureVector;
  const fingerprintMatches = await storedPredictionMatchesCurrentFeatures({
    fixtureExternalId,
    storedSnapshot: snapshot,
  });
  if (!fingerprintMatches) {
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

  if (
    !PREMATCH_STATUSES.has(fixture.status) ||
    isKickoffReached(fixture.kickoff_at)
  ) {
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

  if (!isPrematchComputeWindowOpen(fixture.kickoff_at)) {
    const row = await readLatestPrematchPrediction(fixture.id);
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

  const fixture = await resolveFixtureUuidByExternalId(fixtureExternalId);
  if (!fixture) {
    return null;
  }

  const prematchRow = await readPrematchRowForFixture(fixture);
  if (!prematchRow) {
    return null;
  }

  return mapPredictionRowToResult(
    prematchRow,
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
