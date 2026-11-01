import { hasApiFootballConfig } from "@/lib/env";
import { getIngestionConfig } from "@/lib/ingestion/config";
import { syncFixtures } from "@/lib/ingestion/sync-fixtures";

async function main() {
  if (!hasApiFootballConfig(process.env)) {
    console.error(
      "Missing API_FOOTBALL_KEY. Add it to .env.local before running sync."
    );
    process.exit(1);
  }

  const anchorArg = process.argv[2]?.trim();
  const anchor = anchorArg
    ? new Date(`${anchorArg}T12:00:00.000Z`)
    : new Date();
  if (anchorArg && Number.isNaN(anchor.getTime())) {
    console.error(`Invalid anchor date (expected YYYY-MM-DD): ${anchorArg}`);
    process.exit(1);
  }

  // D2 (PL stale NS): prod 7d window + Ekstraklasa-only unless explicitly overridden.
  if (process.env.SYNC_FIXTURES_D2 === "1") {
    process.env.NEXT_PUBLIC_APP_ENV ??= "production";
    if (!process.env.INGESTION_LEAGUE_PROVIDER_IDS?.trim()) {
      process.env.INGESTION_LEAGUE_PROVIDER_IDS = "39";
    }
  }

  const { leagueProviderIds, fixtureWindowDays } = getIngestionConfig();
  console.log(
    anchorArg
      ? `Running sync-fixtures (anchor ${anchorArg}, leagues=${leagueProviderIds.length}, windowDays=${fixtureWindowDays})...`
      : `Running sync-fixtures (leagues=${leagueProviderIds.length}, windowDays=${fixtureWindowDays})...`
  );

  const result = await syncFixtures(anchor);
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("sync-fixtures failed:", error);
  process.exit(1);
});
