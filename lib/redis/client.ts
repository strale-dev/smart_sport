import { Redis } from "@upstash/redis";

import { normalizeEnvValue } from "@/lib/env/normalize-env-value";
import { hasRedisConfig } from "@/lib/env";

let cachedRedis: Redis | null | undefined;

function readRedisEnv(
  key: "UPSTASH_REDIS_REST_URL" | "UPSTASH_REDIS_REST_TOKEN"
): string | undefined {
  const value = process.env[key];
  return value ? normalizeEnvValue(value) : undefined;
}

export function getRedis(): Redis | null {
  if (cachedRedis !== undefined) {
    return cachedRedis;
  }

  if (!hasRedisConfig(process.env)) {
    cachedRedis = null;
    return cachedRedis;
  }

  cachedRedis = new Redis({
    url: readRedisEnv("UPSTASH_REDIS_REST_URL")!,
    token: readRedisEnv("UPSTASH_REDIS_REST_TOKEN")!,
  });

  return cachedRedis;
}

export async function pingRedis(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    const response = await redis.ping();
    return response === "PONG";
  } catch {
    return false;
  }
}

export function resetRedisClientForTests(): void {
  cachedRedis = undefined;
}
