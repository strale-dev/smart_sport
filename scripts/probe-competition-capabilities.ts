import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  mergeProbedCapabilitiesIntoRegistry,
  type CompetitionCapabilitiesProbeFile,
  type CompetitionCapabilityProbeResult,
} from "@/lib/competitions/merge-probed-capabilities";
import { probeCompetitionCapabilities } from "@/lib/competitions/probe-capabilities";
import { selectCompetitionsForCapabilityProbe } from "@/lib/competitions/probe-selection";
import type { CompetitionRegistryFile } from "@/lib/competitions/types";
import { hasApiFootballConfig } from "@/lib/env";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const registryPath = path.join(
  rootDir,
  "lib/competitions/registry.generated.json"
);
const sidecarPath = path.join(
  rootDir,
  "lib/competitions/registry.capabilities-probed.json"
);

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes("--dry-run"),
    selectionOnly: argv.includes("--selection-only"),
  };
}

async function main() {
  const { dryRun, selectionOnly } = parseArgs(process.argv.slice(2));

  if (!hasApiFootballConfig(process.env)) {
    console.error(
      "Missing API_FOOTBALL_KEY. Set it in .env.local before probing capabilities."
    );
    process.exit(1);
  }

  if (!fs.existsSync(registryPath)) {
    console.error(
      `Registry not found at ${registryPath}. Run npm.cmd run build:competition-registry first.`
    );
    process.exit(1);
  }

  const registry = JSON.parse(
    fs.readFileSync(registryPath, "utf8")
  ) as CompetitionRegistryFile;

  const selected = selectCompetitionsForCapabilityProbe(registry.competitions);

  console.log(
    JSON.stringify(
      {
        registryPath,
        sidecarPath,
        enabledCount: registry.competitions.length,
        selectedCount: selected.length,
        tier1: selected.filter((item) => item.tier === 1).length,
        nationalTeam: selected.filter(
          (item) => item.category === "national_team"
        ).length,
        dryRun,
        selectionOnly,
      },
      null,
      2
    )
  );

  if (dryRun || selectionOnly) {
    console.log(
      selected.map((item) => ({
        providerId: item.providerId,
        name: item.name,
        tier: item.tier,
        category: item.category,
      }))
    );
    return;
  }

  const results: CompetitionCapabilityProbeResult[] = [];
  const writeCheckpoint = () => {
    const probeFile: CompetitionCapabilitiesProbeFile = {
      probedAt: new Date().toISOString(),
      source: "api-football/capability-probe",
      selectionNote:
        "Tier 1 + all national_team + deterministic Tier 2/3 sample",
      results,
    };
    fs.writeFileSync(
      sidecarPath,
      `${JSON.stringify(probeFile, null, 2)}\n`,
      "utf8"
    );
    const merged = mergeProbedCapabilitiesIntoRegistry(registry, probeFile);
    fs.writeFileSync(
      registryPath,
      `${JSON.stringify(merged, null, 2)}\n`,
      "utf8"
    );
  };

  for (const competition of selected) {
    console.log(
      `Probing ${competition.providerId} — ${competition.name} (tier ${competition.tier})...`
    );
    const result = await probeCompetitionCapabilities(competition);
    results.push(result);
    writeCheckpoint();
    console.log(
      JSON.stringify(
        {
          providerId: result.providerId,
          seasonYear: result.seasonYear,
          sampleFixtureId: result.sampleFixtureId,
          capabilities: result.capabilities,
        },
        null,
        2
      )
    );
  }

  console.log(
    JSON.stringify(
      {
        sidecarPath,
        registryPath,
        probedCompetitions: results.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Capability probe failed:", error);
  process.exit(1);
});
