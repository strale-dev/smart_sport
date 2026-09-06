import { hasOpenAiConfig } from "@/lib/env";
import { loadUpcomingFixtures } from "@/lib/analytics/point-in-time";
import {
  generatePrematchInsight,
  readPrematchInsight,
} from "@/lib/services/aiService";

async function main() {
  if (!hasOpenAiConfig()) {
    console.error(
      "OPENAI_API_KEY is required for phase4:ai-smoke. Add it to .env.local first."
    );
    process.exit(1);
  }

  const upcoming = await loadUpcomingFixtures(3);
  if (upcoming.length === 0) {
    console.error("No upcoming fixtures found for AI smoke test.");
    process.exit(1);
  }

  const fixtureId = upcoming[0]!.provider_id;

  const cronResult = await generatePrematchInsight(fixtureId, {
    trigger: "cron",
  });

  if (cronResult.status !== "OK" && cronResult.status !== "FALLBACK") {
    console.error("Unexpected cron generation result:", cronResult);
    process.exit(1);
  }

  const second = await generatePrematchInsight(fixtureId, {
    trigger: "cron",
  });

  if (second.status !== "OK") {
    console.error("Expected cached OK result on second call:", second);
    process.exit(1);
  }

  if (!second.cached) {
    console.error("Second call should be served from cache.");
    process.exit(1);
  }

  const readOnly = await readPrematchInsight(fixtureId);
  if (readOnly.status !== "OK") {
    console.error(
      "readPrematchInsight should return OK after generation:",
      readOnly
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        fixtureId,
        firstStatus: cronResult.status,
        secondCached: second.cached,
        note: "Daily quota is covered by lib/ai/usage-gate.test.ts",
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Phase 4 AI smoke failed:", error);
  process.exit(1);
});
