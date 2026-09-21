import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCompetitionRegistry } from "@/lib/competitions/build-registry";
import {
  mergeProbedCapabilitiesIntoRegistry,
  type CompetitionCapabilitiesProbeFile,
} from "@/lib/competitions/merge-probed-capabilities";
import type { RawRegistryLeagueEntry } from "@/lib/competitions/types";
import { hasApiFootballConfig } from "@/lib/env";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const outputPath = path.join(
  rootDir,
  "lib/competitions/registry.generated.json"
);
const probeSidecarPath = path.join(
  rootDir,
  "lib/competitions/registry.capabilities-probed.json"
);

async function fetchLeaguesFromApi(): Promise<RawRegistryLeagueEntry[]> {
  const { listLeagues } = await import("@/lib/api-football/endpoints/leagues");
  const entries = await listLeagues();
  return entries.map((entry) => entry.raw);
}

async function main() {
  if (!hasApiFootballConfig(process.env)) {
    console.error(
      "Missing API_FOOTBALL_KEY. Set it in .env.local to rebuild the registry."
    );
    process.exit(1);
  }

  console.log("Fetching competitions from API-Football...");
  const apiEntries = await fetchLeaguesFromApi();
  let registry = buildCompetitionRegistry(apiEntries);

  if (fs.existsSync(probeSidecarPath)) {
    const probeFile = JSON.parse(
      fs.readFileSync(probeSidecarPath, "utf8")
    ) as CompetitionCapabilitiesProbeFile;
    registry = mergeProbedCapabilitiesIntoRegistry(registry, probeFile);
  }

  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        outputPath,
        totalFromApi: registry.totalFromApi,
        enabledCount: registry.enabledCount,
        tier1: registry.competitions.filter((item) => item.tier === 1).length,
        tier2: registry.competitions.filter((item) => item.tier === 2).length,
        tier3: registry.competitions.filter((item) => item.tier === 3).length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Registry build failed:", error);
  process.exit(1);
});
