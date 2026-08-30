import { getInMemoryQuotaSnapshot } from "@/lib/api-football/quota";
import { ApiFootballError } from "@/lib/api-football/errors";
import {
  getApiFootballDailyLimit,
  hasApiFootballConfig,
  hasRedisConfig,
} from "@/lib/env";
import { pingRedis } from "@/lib/redis/client";
import * as footballService from "@/lib/services/footballService";

function explainProviderAuthFailure(error: unknown): void {
  if (!(error instanceof ApiFootballError)) {
    return;
  }

  const tokenError = error.providerErrors?.token;
  if (!tokenError) {
    return;
  }

  console.error(
    "\nAPI-Football rejected API_FOOTBALL_KEY from .env.local.\n" +
      "Verify the key at https://dashboard.api-football.com/ and ensure it is active.\n" +
      `Provider message: ${tokenError}`
  );
}

async function main() {
  if (!hasApiFootballConfig(process.env)) {
    console.error(
      "Missing API_FOOTBALL_KEY. Add it to .env.local before running the cache smoke test."
    );
    process.exit(1);
  }

  console.log(`API-Football daily limit: ${getApiFootballDailyLimit()}`);

  if (!hasRedisConfig(process.env)) {
    console.warn(
      "⚠ UPSTASH_REDIS_REST_URL/TOKEN not configured — cache uses in-memory fallback only."
    );
  } else if (await pingRedis()) {
    console.log("Redis: connected (PONG)");
  } else {
    throw new Error(
      "UPSTASH_REDIS_* is set but Redis ping failed — check URL/token pair in .env.local"
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  console.log(`Running cache smoke test for ${today}...`);

  const cold = await footballService.getMatchesForDate(today);
  console.log(
    `Cold getMatchesForDate: ${cold.data.length} fixtures (cached=${cold.meta.cached}, stale=${cold.meta.stale})`
  );

  const warm = await footballService.getMatchesForDate(today);
  if (!warm.meta.cached) {
    throw new Error("Expected warm getMatchesForDate to be served from cache.");
  }
  console.log(
    `Warm getMatchesForDate: cached=${warm.meta.cached}, stale=${warm.meta.stale}`
  );

  if (cold.data.length > 0) {
    const fixtureId = cold.data[0]!.externalId;
    const hits: boolean[] = [];

    for (let index = 0; index < 5; index += 1) {
      const result = await footballService.getFixtureById(fixtureId);
      hits.push(result.meta.cached);
      console.log(
        `getFixtureById #${index + 1}: cached=${result.meta.cached}, stale=${result.meta.stale}`
      );
    }

    const hitRate = hits.filter(Boolean).length / hits.length;
    console.log(`Fixture cache hit rate: ${(hitRate * 100).toFixed(0)}%`);
    if (hitRate < 0.8) {
      throw new Error(`Cache hit rate too low: ${hitRate}`);
    }
  } else {
    console.log("No fixtures today — skipping getFixtureById hit-rate check.");
  }

  const quota = getInMemoryQuotaSnapshot();
  console.log("Quota snapshot:", quota);
  console.log("Cache smoke test passed.");
}

main().catch((error) => {
  explainProviderAuthFailure(error);
  console.error("Cache smoke test failed:", error);
  process.exit(1);
});
