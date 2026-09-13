import { syncLineups } from "@/lib/ingestion/sync-lineups";
import { hasApiFootballConfig } from "@/lib/env";

async function main() {
  if (!hasApiFootballConfig(process.env)) {
    console.error(
      "Missing API_FOOTBALL_KEY. Add it to .env.local before running sync."
    );
    process.exit(1);
  }

  console.log("Running sync-lineups...");
  const result = await syncLineups();
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("sync-lineups failed:", error);
  process.exit(1);
});
