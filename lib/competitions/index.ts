import generated from "@/lib/competitions/registry.generated.json";
import {
  MORE_TAB_PROVIDER_IDS,
  PRIMARY_TAB_PROVIDER_IDS,
} from "@/lib/competitions/legacy";
import type {
  CompetitionDefinition,
  CompetitionRegistryFile,
  CompetitionTier,
} from "@/lib/competitions/types";

const registry = generated as CompetitionRegistryFile;

const byProviderId = new Map<number, CompetitionDefinition>(
  registry.competitions.map((item) => [item.providerId, item])
);

export function getRegistryMetadata(): Omit<
  CompetitionRegistryFile,
  "competitions"
> {
  return {
    generatedAt: registry.generatedAt,
    source: registry.source,
    totalFromApi: registry.totalFromApi,
    enabledCount: registry.enabledCount,
  };
}

export function getCompetitionRegistry(): readonly CompetitionDefinition[] {
  return registry.competitions;
}

export function findCompetition(
  providerId: number
): CompetitionDefinition | undefined {
  return byProviderId.get(providerId);
}

export function getEnabledProviderIds(): number[] {
  return registry.competitions.map((item) => item.providerId);
}

export function isEnabledCompetition(providerId: number): boolean {
  return byProviderId.has(providerId);
}

export function getCompetitionTier(providerId: number): CompetitionTier | null {
  return byProviderId.get(providerId)?.tier ?? null;
}

export function getLeagueLogoUrl(providerId: number): string {
  return `https://media.api-sports.io/football/leagues/${providerId}.png`;
}

export type CompetitionTab = {
  providerId: number;
  label: string;
  shortLabel?: string;
};

function tabLabel(competition: CompetitionDefinition): CompetitionTab {
  const shortLabels: Record<number, string> = {
    39: "EPL",
    78: "BL",
    2: "UCL",
    3: "UEL",
    848: "UECL",
  };

  return {
    providerId: competition.providerId,
    label: competition.name,
    shortLabel: shortLabels[competition.providerId],
  };
}

export function getPrimaryLeagueTabs(): CompetitionTab[] {
  return PRIMARY_TAB_PROVIDER_IDS.map((providerId) => {
    const competition = byProviderId.get(providerId);
    if (!competition) {
      return {
        providerId,
        label: `League ${providerId}`,
      };
    }
    return tabLabel(competition);
  });
}

export function getMoreLeagueTabs(): CompetitionTab[] {
  const extraTier1 = [71, 128, 253, 262] as const;
  const ids = [...MORE_TAB_PROVIDER_IDS, ...extraTier1];
  const seen = new Set<number>();

  return ids
    .filter((id) => {
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return byProviderId.has(id);
    })
    .map((providerId) => {
      const competition = byProviderId.get(providerId)!;
      return tabLabel(competition);
    });
}

export function getAllLeagueTabProviderIds(): Set<number> {
  return new Set([
    ...getPrimaryLeagueTabs().map((tab) => tab.providerId),
    ...getMoreLeagueTabs().map((tab) => tab.providerId),
  ]);
}

export function findLeagueTab(providerId: number): CompetitionTab | undefined {
  return (
    getPrimaryLeagueTabs().find((tab) => tab.providerId === providerId) ??
    getMoreLeagueTabs().find((tab) => tab.providerId === providerId)
  );
}

export function searchCompetitions(input: {
  query?: string;
  countryCode?: string | null;
  countryName?: string | null;
}): CompetitionDefinition[] {
  const query = input.query?.trim().toLowerCase() ?? "";
  const countryCode = input.countryCode?.trim().toLowerCase();
  const countryName = input.countryName?.trim().toLowerCase();

  return registry.competitions.filter((item) => {
    if (countryCode && item.countryCode?.toLowerCase() !== countryCode) {
      return false;
    }
    if (countryName && item.countryName.toLowerCase() !== countryName) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (
      item.name.toLowerCase().includes(query) ||
      item.countryName.toLowerCase().includes(query)
    );
  });
}

export function listDistinctCountries(): Array<{
  name: string;
  code: string | null;
}> {
  const map = new Map<string, string | null>();
  for (const item of registry.competitions) {
    if (!map.has(item.countryName)) {
      map.set(item.countryName, item.countryCode);
    }
  }
  return [...map.entries()]
    .map(([name, code]) => ({ name, code }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
