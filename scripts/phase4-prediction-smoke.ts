import { loadUpcomingFixtures } from "@/lib/analytics/point-in-time";
import { maxWinProbability } from "@/lib/models/confidence";
import { probabilitiesSum } from "@/lib/models/logistic";
import { getOrComputePrematch } from "@/lib/services/predictionService";

async function main() {
  const upcoming = await loadUpcomingFixtures(10);
  if (upcoming.length === 0) {
    console.error("No upcoming fixtures found for smoke test.");
    process.exit(1);
  }

  const results = [];

  for (const fixture of upcoming) {
    const first = await getOrComputePrematch(fixture.provider_id);
    const second = await getOrComputePrematch(fixture.provider_id);

    if (!first || !second) {
      console.error(
        `Failed to compute prediction for fixture ${fixture.provider_id}`
      );
      process.exit(1);
    }

    const sum = probabilitiesSum(first.winProbabilities);
    const maxProb = maxWinProbability(first.winProbabilities);

    if (sum < 0.99 || sum > 1.01) {
      console.error(
        `Invalid probability sum for fixture ${fixture.provider_id}: ${sum}`
      );
      process.exit(1);
    }

    if (maxProb <= 0) {
      console.error(`Zero max probability for fixture ${fixture.provider_id}`);
      process.exit(1);
    }

    if (first.predictionId !== second.predictionId) {
      console.error(
        `Read-through failed for fixture ${fixture.provider_id}: duplicate inserts`
      );
      process.exit(1);
    }

    results.push({
      fixtureId: fixture.provider_id,
      outcome: first.predictedOutcome,
      maxProb: Number(maxProb.toFixed(3)),
      confidence: first.confidence,
      fromCache: second.fromCache,
    });
  }

  console.log(
    JSON.stringify({ ok: true, checked: results.length, results }, null, 2)
  );
}

main().catch((error) => {
  console.error("Phase 4 prediction smoke failed:", error);
  process.exit(1);
});
