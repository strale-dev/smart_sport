import {
  defaultCapabilitiesFor,
  mergeCapabilities,
} from "@/lib/competitions/capabilities";
import { COMPETITION_OVERRIDES } from "@/lib/competitions/registry.overrides";
import { hasActiveSeason, matchSeed } from "@/lib/competitions/registry.seed";
import type {
  CompetitionDefinition,
  CompetitionRegistryFile,
  RawRegistryLeagueEntry,
} from "@/lib/competitions/types";

function normalizeProviderType(type: string): "League" | "Cup" | null {
  const normalized = type.toLowerCase();
  if (normalized === "league") {
    return "League";
  }
  if (normalized === "cup") {
    return "Cup";
  }
  return null;
}

function applyOverrides(
  competition: CompetitionDefinition
): CompetitionDefinition {
  const override = COMPETITION_OVERRIDES.find(
    (item) => item.providerId === competition.providerId
  );
  if (!override) {
    return competition;
  }

  return {
    ...competition,
    enabled: override.enabled ?? competition.enabled,
    tier: override.tier ?? competition.tier,
    category: override.category ?? competition.category,
    capabilities: mergeCapabilities(
      competition.capabilities,
      override.capabilities
    ),
  };
}

function buildFromSeed(
  entry: RawRegistryLeagueEntry
): CompetitionDefinition | null {
  const providerType = normalizeProviderType(entry.league.type);
  if (!providerType) {
    return null;
  }

  const seed = matchSeed(entry);
  if (!seed) {
    return null;
  }

  const capabilities = defaultCapabilitiesFor(providerType, seed.category);

  return applyOverrides({
    providerId: entry.league.id,
    name: entry.league.name,
    countryName: entry.country.name,
    countryCode: entry.country.code,
    providerType,
    category: seed.category,
    tier: seed.tier,
    enabled: true,
    capabilities,
  });
}

function seedIsAlwaysOn(competition: CompetitionDefinition): boolean {
  return (
    competition.tier === 1 ||
    competition.category === "national_team" ||
    competition.category === "continental_club"
  );
}

export function buildCompetitionRegistry(
  apiEntries: RawRegistryLeagueEntry[],
  generatedAt = new Date().toISOString()
): CompetitionRegistryFile {
  const byId = new Map<number, CompetitionDefinition>();

  for (const entry of apiEntries) {
    const fromSeed = buildFromSeed(entry);
    if (!fromSeed) {
      continue;
    }

    if (!seedIsAlwaysOn(fromSeed) && !hasActiveSeason(entry)) {
      continue;
    }

    byId.set(fromSeed.providerId, fromSeed);
  }

  const competitions = [...byId.values()].sort((left, right) => {
    if (left.tier !== right.tier) {
      return left.tier - right.tier;
    }
    return left.name.localeCompare(right.name);
  });

  return {
    generatedAt,
    source: "api-football/leagues",
    totalFromApi: apiEntries.length,
    enabledCount: competitions.length,
    competitions,
  };
}
