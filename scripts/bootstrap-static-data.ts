import { bootstrapStaticData } from "@/lib/ingestion/bootstrap-static-data";
import { hasApiFootballConfig } from "@/lib/env";

async function main() {
  if (!hasApiFootballConfig(process.env)) {
    console.error(
      "Missing API_FOOTBALL_KEY. Add it to .env.local before running bootstrap."
    );
    process.exit(1);
  }

  console.log("Bootstrapping static league metadata...");
  const result = await bootstrapStaticData();
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Bootstrap failed:", error);
  process.exit(1);
});
