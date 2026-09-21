import { getAiPrematchCacheTtlSec } from "@/lib/env";
import { readInsightByContextHash, type AiInsightRow } from "@/lib/ai/db";
import {
  aiLiveInsightKey,
  aiLiveLockKey,
  aiPrematchInsightKey,
  aiPrematchLockKey,
} from "@/lib/redis/keys";
import { peekCachedValue, writeCachedValue } from "@/lib/redis/cache";
import { LockNotAcquiredError, withRenewableLock } from "@/lib/redis/lock";
import { prematchAnalysisSchema, type StoredAIInsight } from "@/lib/ai/schemas";

const LOCK_TTL_SECONDS = 45;
const LOCK_RENEW_INTERVAL_MS = 10_000;
const LOCK_WAIT_ATTEMPTS = 8;
const LOCK_WAIT_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function mapAiInsightRowToStored(
  row: AiInsightRow,
  fixtureExternalId: number,
  cached: boolean
): StoredAIInsight {
  const winProbabilities =
    row.win_probabilities as StoredAIInsight["winProbabilities"];
  const keyFactors = row.key_factors as StoredAIInsight["keyFactors"];
  const scenarios = row.scenarios as StoredAIInsight["scenarios"];
  const expectedGoalsRange = parseExpectedGoalsRange(row.expected_goals_range);

  return {
    id: row.id,
    fixtureExternalId,
    fixtureId: row.fixture_id ?? "",
    predictionId: row.prediction_id,
    contextHash: row.context_hash,
    openaiModel: row.openai_model,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
    cached,
    summary: row.summary ?? "",
    advantage: row.advantage ?? "EVEN",
    winOutcome: row.win_outcome ?? "X",
    winProbabilities,
    expectedGoalsRange,
    weakerTeamScoringChance:
      row.weaker_team_scoring_chance != null
        ? Number(row.weaker_team_scoring_chance)
        : null,
    confidence: row.confidence,
    keyFactors,
    scenarios,
    commentary: row.commentary ?? "",
    dataUsed: parseDataUsedFromRawOutput(row.raw_output),
    dataTimestamp: row.data_timestamp,
    dataQuality: row.data_quality,
    dataCoverage: parseDataCoverageFromRawOutput(row.raw_output),
    analysis: parseAnalysisFromRawOutput(row.raw_output),
  };
}

function parseAnalysisFromRawOutput(raw: unknown): StoredAIInsight["analysis"] {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const direct = record.analysis;
  if (direct) {
    const parsed = prematchAnalysisSchema.safeParse(direct);
    if (parsed.success) {
      return parsed.data;
    }
  }

  const narrative = record.narrative;
  if (narrative && typeof narrative === "object") {
    const nested = (narrative as Record<string, unknown>).analysis;
    if (nested) {
      const parsed = prematchAnalysisSchema.safeParse(nested);
      if (parsed.success) {
        return parsed.data;
      }
    }
  }

  return null;
}

function parseDataCoverageFromRawOutput(
  raw: unknown
): StoredAIInsight["dataCoverage"] {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const coverage = record.dataCoverage;
  if (!coverage || typeof coverage !== "object") {
    return null;
  }

  const payload = coverage as Record<string, unknown>;
  const dataAvailable = payload.dataAvailable;
  const dataMissing = payload.dataMissing;

  if (!Array.isArray(dataAvailable) || !Array.isArray(dataMissing)) {
    return null;
  }

  return {
    dataAvailable: dataAvailable.filter(
      (entry): entry is string => typeof entry === "string"
    ),
    dataMissing: dataMissing.filter(
      (entry): entry is string => typeof entry === "string"
    ),
  };
}

function parseDataUsedFromRawOutput(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const record = raw as Record<string, unknown>;
  if (Array.isArray(record.dataUsed)) {
    return record.dataUsed.filter(
      (entry): entry is string => typeof entry === "string"
    );
  }

  const narrative = record.narrative;
  if (narrative && typeof narrative === "object") {
    const dataUsed = (narrative as Record<string, unknown>).dataUsed;
    if (Array.isArray(dataUsed)) {
      return dataUsed.filter(
        (entry): entry is string => typeof entry === "string"
      );
    }
  }

  return [];
}

function parseExpectedGoalsRange(value: unknown): [number, number] {
  if (Array.isArray(value) && value.length === 2) {
    return [Number(value[0]), Number(value[1])];
  }

  if (typeof value === "string") {
    const match = value.match(/\[(\d+),(\d+)\)/);
    if (match) {
      return [Number(match[1]), Number(match[2])];
    }
  }

  if (value && typeof value === "object") {
    const range = value as { lower?: number; upper?: number };
    if (range.lower != null && range.upper != null) {
      return [Number(range.lower), Number(range.upper)];
    }
  }

  return [0, 0];
}

export async function readCachedPrematchInsight(
  fixtureExternalId: number,
  contextHash: string
): Promise<StoredAIInsight | null> {
  const cacheKey = aiPrematchInsightKey(fixtureExternalId, contextHash);
  const cached = await peekCachedValue<StoredAIInsight>(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  return null;
}

export async function readPrematchInsightFromStore(
  fixtureUuid: string,
  fixtureExternalId: number,
  contextHash: string
): Promise<StoredAIInsight | null> {
  const cached = await readCachedPrematchInsight(
    fixtureExternalId,
    contextHash
  );
  if (cached) {
    return cached;
  }

  const row = await readInsightByContextHash(
    fixtureUuid,
    "PREMATCH",
    contextHash
  );
  if (!row) {
    return null;
  }

  const insight = mapAiInsightRowToStored(row, fixtureExternalId, true);
  await writePrematchInsightCache(fixtureExternalId, contextHash, insight);
  return insight;
}

export async function writePrematchInsightCache(
  fixtureExternalId: number,
  contextHash: string,
  insight: StoredAIInsight
): Promise<void> {
  const cacheKey = aiPrematchInsightKey(fixtureExternalId, contextHash);
  await writeCachedValue(cacheKey, insight, getAiPrematchCacheTtlSec());
}

export async function withPrematchInsightLock<T>(
  fixtureExternalId: number,
  fn: () => Promise<T>
): Promise<T> {
  const lockKey = aiPrematchLockKey(fixtureExternalId);

  try {
    return await withRenewableLock(
      lockKey,
      LOCK_TTL_SECONDS,
      LOCK_RENEW_INTERVAL_MS,
      fn
    );
  } catch (error) {
    if (!(error instanceof LockNotAcquiredError)) {
      throw error;
    }

    for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt += 1) {
      await sleep(LOCK_WAIT_MS);
      try {
        return await fn();
      } catch (retryError) {
        if (!(retryError instanceof LockNotAcquiredError)) {
          throw retryError;
        }
      }
    }

    throw error;
  }
}

export async function readLiveInsightFromStore(
  fixtureUuid: string,
  fixtureExternalId: number,
  contextHash: string
): Promise<StoredAIInsight | null> {
  const cacheKey = aiLiveInsightKey(fixtureExternalId, contextHash);
  const cached = await peekCachedValue<StoredAIInsight>(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  const row = await readInsightByContextHash(fixtureUuid, "LIVE", contextHash);
  if (!row) {
    return null;
  }

  const insight = mapAiInsightRowToStored(row, fixtureExternalId, true);
  await writeLiveInsightCache(fixtureExternalId, contextHash, insight);
  return insight;
}

export async function writeLiveInsightCache(
  fixtureExternalId: number,
  contextHash: string,
  insight: StoredAIInsight
): Promise<void> {
  const cacheKey = aiLiveInsightKey(fixtureExternalId, contextHash);
  await writeCachedValue(cacheKey, insight, getAiPrematchCacheTtlSec());
}

export async function withLiveInsightLock<T>(
  fixtureExternalId: number,
  fn: () => Promise<T>
): Promise<T> {
  const lockKey = aiLiveLockKey(fixtureExternalId);

  try {
    return await withRenewableLock(
      lockKey,
      LOCK_TTL_SECONDS,
      LOCK_RENEW_INTERVAL_MS,
      fn
    );
  } catch (error) {
    if (!(error instanceof LockNotAcquiredError)) {
      throw error;
    }

    for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt += 1) {
      await sleep(LOCK_WAIT_MS);
      try {
        return await fn();
      } catch (retryError) {
        if (!(retryError instanceof LockNotAcquiredError)) {
          throw retryError;
        }
      }
    }

    throw error;
  }
}
