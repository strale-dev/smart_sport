import { ApiFootballQuotaError } from "@/lib/api-football/errors";
import {
  getInMemoryQuotaSnapshot,
  recordQuotaFromHeaders,
  shouldRefuseNonCriticalRequest,
} from "@/lib/api-football/quota";
import { hasRedisConfig } from "@/lib/env";
import { cached } from "@/lib/redis/cache";
import { pingRedis } from "@/lib/redis/client";
import { providerFixtureKey } from "@/lib/redis/keys";
import * as footballService from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

async function main() {
  if (!hasRedisConfig(process.env)) {
    console.error(
      "UPSTASH_REDIS_REST_URL/TOKEN required for quota smoke test."
    );
    process.exit(1);
  }

  if (!(await pingRedis())) {
    throw new Error("Redis ping failed — check Upstash credentials.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const matches = await footballService.getMatchesForDate(today);

  if (matches.data.length === 0) {
    console.error("No fixtures today — run sync-fixtures before quota smoke.");
    process.exit(1);
  }

  const fixtureId = matches.data[0]!.externalId;
  console.log(`Warming cache for fixture ${fixtureId}...`);

  const warm = await footballService.getFixtureById(fixtureId);
  console.log(
    `Warm getFixtureById: cached=${warm.meta.cached}, stale=${warm.meta.stale}`
  );

  await recordQuotaFromHeaders(
    new Headers({
      "x-ratelimit-requests-remaining": "0",
    })
  );

  const snapshot = getInMemoryQuotaSnapshot();
  if (!shouldRefuseNonCriticalRequest(snapshot)) {
    throw new Error("Expected quota snapshot to refuse non-critical requests.");
  }
  console.log("Quota snapshot after injection:", snapshot);

  const cacheKey = providerFixtureKey(fixtureId);
  const staleResult = await cached<Fixture>({
    key: cacheKey,
    freshTtlSeconds: 0,
    staleTtlSeconds: 86_400,
    fn: async () => {
      throw new ApiFootballQuotaError(
        "API-Football daily quota is low; non-critical request refused."
      );
    },
  });

  if (!staleResult.meta.stale) {
    throw new Error("Expected stale cache fallback when quota is exhausted.");
  }

  console.log(
    `Stale fallback OK: fixture ${staleResult.value.externalId}, cached=${staleResult.meta.cached}, stale=${staleResult.meta.stale}`
  );
  console.log("Quota smoke test passed.");
}

main().catch((error) => {
  console.error("Quota smoke test failed:", error);
  process.exit(1);
});
