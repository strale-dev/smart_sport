import { bootstrapStaticData } from "@/lib/ingestion/bootstrap-static-data";
import {
  resolveMatchDetailsBootstrapTargets,
  runIngestionDiagnosis,
  type IngestDevQaStep,
} from "@/lib/ingestion/diagnostics";
import { ingestMatchDetailsFromProvider } from "@/lib/ingestion/ingest-match-details";
import { syncFixtures } from "@/lib/ingestion/sync-fixtures";
import { hasApiFootballConfig } from "@/lib/env";

function parseArgs(argv: string[]) {
  return {
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
    skipStatic: argv.includes("--skip-static"),
    skipMatchDetails: argv.includes("--skip-match-details"),
  };
}

function stepLabel(step: IngestDevQaStep): string {
  switch (step) {
    case "static":
      return "bootstrap:static-data";
    case "fixtures":
      return "sync:fixtures";
    case "match_details":
      return "bootstrap:match-details";
    default:
      return step;
  }
}

async function runStep(step: IngestDevQaStep): Promise<void> {
  switch (step) {
    case "static": {
      console.log("\n▶ bootstrap:static-data");
      const result = await bootstrapStaticData();
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) {
        throw new Error("bootstrap:static-data failed");
      }
      return;
    }
    case "fixtures": {
      console.log("\n▶ sync:fixtures");
      const result = await syncFixtures();
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) {
        throw new Error("sync:fixtures failed");
      }
      return;
    }
    case "match_details": {
      const targets = await resolveMatchDetailsBootstrapTargets();
      if (targets.length === 0) {
        throw new Error(
          "No FT fixtures to bootstrap — run sync:fixtures first or pass pinned IDs into DB."
        );
      }

      console.log(
        `\n▶ bootstrap:match-details (${targets.length} fixture(s)): ${targets.join(", ")}`
      );

      for (const providerId of targets) {
        const result = await ingestMatchDetailsFromProvider(providerId);
        console.log(JSON.stringify(result, null, 2));
        if (!result.ok) {
          throw new Error(`bootstrap match-details failed for ${providerId}`);
        }
      }
      return;
    }
    default:
      throw new Error(`Unknown step: ${step satisfies never}`);
  }
}

async function main() {
  const { force, dryRun, skipStatic, skipMatchDetails } = parseArgs(
    process.argv.slice(2)
  );

  if (!hasApiFootballConfig(process.env)) {
    console.error(
      "Missing API_FOOTBALL_KEY. Add it to .env.local before running ingest:dev-qa."
    );
    process.exit(1);
  }

  const initial = await runIngestionDiagnosis({
    ingestDevQaForce: force,
    ingestDevQaSkipStatic: skipStatic,
    ingestDevQaSkipMatchDetails: skipMatchDetails,
  });

  const steps = initial.ingestDevQaSteps;

  console.log("ingest:dev-qa plan:");
  if (steps.length === 0) {
    console.log(
      "  (no provider steps needed — DB looks sufficient for dev QA)"
    );
  } else {
    for (const step of steps) {
      console.log(`  - ${stepLabel(step)}`);
    }
  }

  if (dryRun) {
    console.log("\nDry run — no API ingestion executed.");
    return;
  }

  if (steps.length === 0) {
    console.log("\nDone.");
  } else {
    for (const step of steps) {
      await runStep(step);
    }
  }

  const final = await runIngestionDiagnosis({
    ingestDevQaForce: false,
    ingestDevQaSkipStatic: skipStatic,
    ingestDevQaSkipMatchDetails: skipMatchDetails,
  });

  console.log("\n=== Post-run pinned URLs ===");
  for (const row of final.pinnedReports) {
    console.log(
      `  ${row.label}: ${row.matchPath} (${row.overviewHasData ? "overview OK" : "needs data"})`
    );
  }

  if (final.strictWouldFail) {
    console.error(
      "\ningest:dev-qa finished but strict QA still failing — run diagnose:ingestion --strict"
    );
    process.exit(1);
  }

  console.log("\ningest:dev-qa passed strict QA gates.");
}

main().catch((error) => {
  console.error("ingest:dev-qa failed:", error);
  process.exit(1);
});
