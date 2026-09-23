import type { Json } from "@/types/supabase";

import {
  emptyAiUsageRow,
  mergeAiUsageRows,
} from "@/lib/entitlements/merge-usage";
import type { UsageIncrement } from "@/lib/entitlements/usage";
import type { AiUsageRow } from "@/lib/entitlements/usage";
import { getRedis } from "@/lib/redis/client";
import {
  aiUsageActiveUsersKey,
  aiUsageHashKey,
  aiUsageLastLiveKey,
  aiUsageLiveMatchesKey,
} from "@/lib/redis/keys";

const AI_USAGE_REDIS_TTL_SEC = 86_400 * 2;

type RedisPipeline =
  NonNullable<ReturnType<typeof getRedis>> extends infer R
    ? R extends { pipeline: () => infer P }
      ? P
      : never
    : never;

function createTrackedPipeline(
  redis: NonNullable<ReturnType<typeof getRedis>>
): {
  pipeline: RedisPipeline;
  execIfNotEmpty: () => Promise<unknown>;
} {
  const pipeline = redis.pipeline();
  let commandCount = 0;

  return {
    pipeline: new Proxy(pipeline, {
      get(target, property, receiver) {
        const value = Reflect.get(target, property, receiver);
        if (property === "exec") {
          return async () => {
            if (commandCount === 0) {
              return [];
            }
            commandCount = 0;
            return target.exec();
          };
        }

        if (typeof value === "function") {
          return (...args: unknown[]) => {
            commandCount += 1;
            return (value as (...inner: unknown[]) => unknown).apply(
              target,
              args
            );
          };
        }

        return value;
      },
    }) as RedisPipeline,
    execIfNotEmpty: async () => {
      if (commandCount === 0) {
        return [];
      }
      commandCount = 0;
      return pipeline.exec();
    },
  };
}

type RedisHash = {
  predictions?: string;
  deep?: string;
  generations?: string;
};

function parseIntField(raw: string | undefined): number {
  if (!raw) {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function isRedisUsageAvailable(): boolean {
  return getRedis() !== null;
}

async function touchUsageKeys(userId: string, usageDay: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  const { pipeline, execIfNotEmpty } = createTrackedPipeline(redis);
  pipeline.expire(aiUsageHashKey(userId, usageDay), AI_USAGE_REDIS_TTL_SEC);
  pipeline.expire(
    aiUsageLiveMatchesKey(userId, usageDay),
    AI_USAGE_REDIS_TTL_SEC
  );
  pipeline.expire(aiUsageLastLiveKey(userId, usageDay), AI_USAGE_REDIS_TTL_SEC);
  pipeline.sadd(aiUsageActiveUsersKey(usageDay), userId);
  pipeline.expire(aiUsageActiveUsersKey(usageDay), AI_USAGE_REDIS_TTL_SEC);
  await execIfNotEmpty();
}

export async function readRedisUsageRow(
  userId: string,
  usageDay: string
): Promise<AiUsageRow | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const [hash, liveMatches, lastLiveEntries] = await Promise.all([
    redis.hgetall<RedisHash>(aiUsageHashKey(userId, usageDay)),
    redis.smembers(aiUsageLiveMatchesKey(userId, usageDay)),
    redis.hgetall<Record<string, string>>(aiUsageLastLiveKey(userId, usageDay)),
  ]);

  if (
    (!hash || Object.keys(hash).length === 0) &&
    liveMatches.length === 0 &&
    (!lastLiveEntries || Object.keys(lastLiveEntries).length === 0)
  ) {
    return null;
  }

  return {
    ai_predictions_count: parseIntField(hash?.predictions),
    ai_deep_analyses_count: parseIntField(hash?.deep),
    ai_generations_count: parseIntField(hash?.generations),
    live_ai_matches: liveMatches.map(String),
    last_live_ai_at: lastLiveEntries ?? {},
  };
}

export async function incrementRedisUsageCounters(
  userId: string,
  increment: UsageIncrement,
  usageDay: string
): Promise<AiUsageRow | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const { pipeline, execIfNotEmpty } = createTrackedPipeline(redis);
  if (increment.predictions) {
    pipeline.hincrby(
      aiUsageHashKey(userId, usageDay),
      "predictions",
      increment.predictions
    );
  }
  if (increment.deepAnalyses) {
    pipeline.hincrby(
      aiUsageHashKey(userId, usageDay),
      "deep",
      increment.deepAnalyses
    );
  }
  if (increment.generations) {
    pipeline.hincrby(
      aiUsageHashKey(userId, usageDay),
      "generations",
      increment.generations
    );
  }

  await execIfNotEmpty();

  if (increment.liveFixtureUuid) {
    await redis.sadd(
      aiUsageLiveMatchesKey(userId, usageDay),
      increment.liveFixtureUuid
    );
    await redis.hset(aiUsageLastLiveKey(userId, usageDay), {
      [increment.liveFixtureUuid]: new Date().toISOString(),
    });
  }

  await touchUsageKeys(userId, usageDay);

  return readRedisUsageRow(userId, usageDay);
}

export async function listActiveUsageUserIds(
  usageDay: string
): Promise<string[]> {
  const redis = getRedis();
  if (!redis) {
    return [];
  }

  const members = await redis.smembers(aiUsageActiveUsersKey(usageDay));
  return members.map(String);
}

export function rowToMergePayload(row: AiUsageRow): {
  predictions: number;
  deepAnalyses: number;
  generations: number;
  liveMatches: string[];
  lastLiveAt: Json;
} {
  return {
    predictions: row.ai_predictions_count,
    deepAnalyses: row.ai_deep_analyses_count,
    generations: row.ai_generations_count,
    liveMatches: row.live_ai_matches,
    lastLiveAt: row.last_live_ai_at as Json,
  };
}

export async function readMergedUsageRow(
  userId: string,
  usageDay: string,
  postgresRow: AiUsageRow
): Promise<AiUsageRow> {
  const redisRow = await readRedisUsageRow(userId, usageDay);
  if (!redisRow) {
    return postgresRow;
  }

  return mergeAiUsageRows(postgresRow, redisRow);
}

export { emptyAiUsageRow, mergeAiUsageRows };
