import { isApiFootballIngestOnly } from "@/lib/env";
import { getDashboardData } from "@/lib/services/dashboardService";
import { getMatchesForDate } from "@/lib/services/footballService";
import { utcDateString } from "@/lib/fixtures/window";

async function main() {
  if (!isApiFootballIngestOnly()) {
    console.error(
      "Phase 2 dashboard DoD requires API_FOOTBALL_INGEST_ONLY=true so UI reads Postgres, not the live provider."
    );
    process.exit(1);
  }

  const today = utcDateString();
  const { data: todayFixtures } = await getMatchesForDate(today);

  console.log("UTC today:", today);
  console.log("Fixtures today via footballService:", todayFixtures.length);

  if (todayFixtures.length === 0) {
    console.warn(
      "No fixtures for UTC today — dashboard may use fallback window. Run npm.cmd run sync:fixtures first."
    );
  } else {
    const sample = todayFixtures[0];
    console.log("Sample fixture:", {
      externalId: sample?.externalId,
      status: sample?.status,
      home: sample?.homeTeam.name,
      away: sample?.awayTeam.name,
    });
  }

  const dashboard = await getDashboardData();

  console.log("Dashboard sections:", {
    featured: dashboard.featured?.externalId ?? null,
    live: dashboard.live.length,
    todayImportant: dashboard.todayImportant.length,
    upcoming: dashboard.upcoming.length,
    isTodayFallback: dashboard.isTodayFallback,
  });

  const hasRenderableData =
    dashboard.featured != null ||
    dashboard.live.length > 0 ||
    dashboard.todayImportant.length > 0 ||
    dashboard.upcoming.length > 0 ||
    dashboard.fallbackFixtures.length > 0;

  if (!hasRenderableData) {
    console.error(
      "Dashboard has no fixture data. Run sync:fixtures and verify Postgres ingestion."
    );
    process.exit(1);
  }

  console.log("phase2:dashboard-smoke passed.");
}

main().catch((error) => {
  console.error("phase2:dashboard-smoke failed:", error);
  process.exit(1);
});
