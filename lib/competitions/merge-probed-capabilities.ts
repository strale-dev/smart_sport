import { mergeCapabilities } from "@/lib/competitions/capabilities";
import type {
  CompetitionCapabilities,
  CompetitionDefinition,
  CompetitionRegistryFile,
} from "@/lib/competitions/types";

export type CompetitionCapabilityProbeResult = {
  providerId: number;
  seasonYear: number | null;
  sampleFixtureId: number | null;
  capabilities: Partial<CompetitionCapabilities>;
};

export type CompetitionCapabilitiesProbeFile = {
  probedAt: string;
  source: "api-football/capability-probe";
  selectionNote: string;
  results: CompetitionCapabilityProbeResult[];
};

export function applyProbeResultToCapabilities(
  base: CompetitionCapabilities,
  probed: Partial<CompetitionCapabilities> | undefined
): CompetitionCapabilities {
  if (!probed || Object.keys(probed).length === 0) {
    return base;
  }

  return mergeCapabilities(base, probed);
}

export function mergeProbedCapabilitiesIntoRegistry(
  registry: CompetitionRegistryFile,
  probeFile: CompetitionCapabilitiesProbeFile
): CompetitionRegistryFile {
  const probedById = new Map(
    probeFile.results.map((item) => [item.providerId, item.capabilities])
  );

  const competitions: CompetitionDefinition[] = registry.competitions.map(
    (competition) => {
      const probed = probedById.get(competition.providerId);
      if (!probed) {
        return competition;
      }

      return {
        ...competition,
        capabilities: applyProbeResultToCapabilities(
          competition.capabilities,
          probed
        ),
      };
    }
  );

  return {
    ...registry,
    competitions,
  };
}
