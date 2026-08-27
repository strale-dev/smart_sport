import { Redis } from "@upstash/redis";

import { hasRedisConfig } from "@/lib/env";

let cachedRedis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (cachedRedis !== undefined) {
    return cachedRedis;
  }

  if (!hasRedisConfig(process.env)) {
    cachedRedis = null;
    return cachedRedis;
  }

  cachedRedis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return cachedRedis;
}
