import { canGeneratePrematchInsight } from "@/lib/ai/status-map";
import { loadUpcomingFixtures } from "@/lib/analytics/point-in-time";
import { readPrematchInsight } from "@/lib/services/aiService";
import { getFixtureById } from "@/lib/services/footballService";
import { getPlayersToWatch } from "@/lib/services/playersToWatchService";
import { getOrComputePrematch } from "@/lib/services/predictionService";

async function main() {
  const upcoming = await loadUpcomingFixtures(1);
  if (upcoming.length === 0) {
    console.error("No upcoming fixtures found for match smoke test.");
    process.exit(1);
  }

  const fixtureId = upcoming[0]!.provider_id;
  const { data: fixture } = await getFixtureById(fixtureId);

  if (!fixture) {
    console.error(`Fixture ${fixtureId} not found via footballService.`);
    process.exit(1);
  }

  if (!canGeneratePrematchInsight(fixture.status)) {
    console.error(
      `Fixture ${fixtureId} status ${fixture.status} is not prematch-analyzable.`
    );
    process.exit(1);
  }

  const prediction = await getOrComputePrematch(fixtureId);
  if (!prediction) {
    console.error(`Prediction missing for fixture ${fixtureId}.`);
    process.exit(1);
  }

  const insight = await readPrematchInsight(fixtureId);
  if (
    insight.status !== "OK" &&
    insight.status !== "MISS" &&
    insight.status !== "FALLBACK"
  ) {
    console.error("Unexpected prematch insight read status:", insight);
    process.exit(1);
  }

  const playersToWatch = await getPlayersToWatch(fixture);
  if (playersToWatch.phase !== "PREMATCH") {
    console.error(
      "Expected prematch phase for players to watch:",
      playersToWatch
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        fixtureId,
        status: fixture.status,
        predictionOutcome: prediction.predictedOutcome,
        insightStatus: insight.status,
        playersToWatchCount: playersToWatch.players.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Phase 4 match smoke failed:", error);
  process.exit(1);
});
