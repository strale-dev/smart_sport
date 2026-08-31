import { getInMemoryQuotaSnapshot } from "@/lib/api-football/quota";
import { hasRedisConfig } from "@/lib/env";
import { pingRedis } from "@/lib/redis/client";
import * as footballService from "@/lib/services/footballService";

const HIT_RATE_THRESHOLD = 0.9;
const REPEAT_CALLS = 10;
const WINDOW_MS = 60_000;

async function main() {
  if (!hasRedisConfig(process.env)) {
    console.error(
      "Missing UPSTASH_REDIS_REST_URL/TOKEN. Distributed Redis is required for Phase 1 cache DoD."
    );
    process.exit(1);
  }

  if (!(await pingRedis())) {
    throw new Error(
      "UPSTASH_REDIS_* is set but Redis ping failed — check URL/token pair in .env.local"
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  console.log(`Running cache smoke test for ${today} (Redis required)...`);

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

  if (cold.data.length === 0) {
    console.error("No fixtures today — run sync-fixtures before cache smoke.");
    process.exit(1);
  }

  const fixtureId = cold.data[0]!.externalId;
  const hits: boolean[] = [];
  const startedAt = Date.now();

  for (let index = 0; index < REPEAT_CALLS; index += 1) {
    if (Date.now() - startedAt > WINDOW_MS) {
      throw new Error("Cache hit-rate window exceeded 60 seconds.");
    }

    const result = await footballService.getFixtureById(fixtureId);
    hits.push(result.meta.cached);
    console.log(
      `getFixtureById #${index + 1}: cached=${result.meta.cached}, stale=${result.meta.stale}`
    );
  }

  const hitRate = hits.filter(Boolean).length / hits.length;
  console.log(
    `Fixture cache hit rate: ${(hitRate * 100).toFixed(0)}% (${hits.filter(Boolean).length}/${hits.length} within ${WINDOW_MS / 1000}s)`
  );

  if (hitRate < HIT_RATE_THRESHOLD) {
    throw new Error(`Cache hit rate too low: ${hitRate}`);
  }

  const quota = getInMemoryQuotaSnapshot();
  console.log("Quota snapshot:", quota);
  console.log("Cache smoke test passed.");
}

main().catch((error) => {
  console.error("Cache smoke test failed:", error);
  process.exit(1);
});
