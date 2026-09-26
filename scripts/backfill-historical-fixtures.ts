import { backfillHistoricalFixtures } from "@/lib/ingestion/backfill-historical-fixtures";
import { hasApiFootballConfig } from "@/lib/env";

function parseArgs(argv: string[]) {
  const tierArg = argv.find((arg) => arg.startsWith("--tier="));
  const tierRaw = tierArg?.slice("--tier=".length) ?? "1";
  const tier = tierRaw === "2" ? 2 : 1;

  return {
    tier: tier as 1 | 2,
    resume: argv.includes("--resume"),
    dryRun: argv.includes("--dry-run"),
    noGapFill: argv.includes("--no-gap-fill"),
  };
}

async function main() {
  if (!hasApiFootballConfig(process.env)) {
    console.error("Missing API_FOOTBALL_KEY.");
    process.exit(1);
  }

  const { tier, resume, dryRun, noGapFill } = parseArgs(process.argv.slice(2));

  console.log(
    `Backfilling historical fixtures (tier=${tier}, resume=${resume}, dryRun=${dryRun})...`
  );

  const result = await backfillHistoricalFixtures({
    tier,
    resume,
    dryRun,
    gapFillTeams: !noGapFill,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.ingestErrors > 0) {
    console.warn(
      `Backfill finished with ${result.ingestErrors} fixture ingest error(s). Re-run with --resume.`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Historical fixture backfill failed:", error);
  process.exit(1);
});
