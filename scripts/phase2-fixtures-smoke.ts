import { daySectionAnchorId } from "@/lib/fixtures/ids";
import { getFixturesData } from "@/lib/services/fixturesService";

async function main() {
  const data = await getFixturesData({}, "UTC");

  console.log("Fixtures window:", {
    dayGroups: data.dayGroups.length,
    todayDateKey: data.todayDateKey,
    nowAnchorFixtureId: data.nowAnchorFixtureId,
    activeLeagues: data.activeLeagueIds.length,
    isEmpty: data.isEmpty,
  });

  if (data.isEmpty) {
    console.error(
      "Fixtures page is empty. Run npm.cmd run sync:fixtures for a 7-day window."
    );
    process.exit(1);
  }

  if (data.dayGroups.length < 1) {
    console.error("Expected at least one day group.");
    process.exit(1);
  }

  const todayGroup = data.dayGroups.find(
    (group) => group.dateKey === data.todayDateKey
  );
  if (!todayGroup) {
    console.warn(
      "No fixtures grouped under today's date key — scroll anchor will use day section fallback."
    );
  }

  const anchorIds = data.dayGroups.map((group) =>
    daySectionAnchorId(group.dateKey)
  );
  console.log("Day anchor ids:", anchorIds.slice(0, 5));

  console.log("phase2:fixtures-smoke passed.");
}

main().catch((error) => {
  console.error("phase2:fixtures-smoke failed:", error);
  process.exit(1);
});
