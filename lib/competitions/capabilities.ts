import type {
  CompetitionCapabilities,
  CompetitionCategory,
  CompetitionDefinition,
} from "@/lib/competitions/types";

export function defaultCapabilitiesFor(
  providerType: "League" | "Cup",
  category: CompetitionCategory
): CompetitionCapabilities {
  const isLeague = providerType === "League";

  return {
    fixtures: true,
    standings: isLeague && category === "domestic_league",
    lineups: true,
    fixtureStatistics: true,
    fixtureEvents: true,
    teamSeasonStatistics: isLeague && category === "domestic_league",
    playerLeaderboards: isLeague && category === "domestic_league",
  };
}

export function mergeCapabilities(
  base: CompetitionCapabilities,
  patch?: Partial<CompetitionCapabilities>
): CompetitionCapabilities {
  return patch ? { ...base, ...patch } : base;
}

export function competitionSupportsStandings(
  competition: Pick<CompetitionDefinition, "capabilities"> | null | undefined
): boolean {
  return competition?.capabilities.standings ?? false;
}

export function competitionSupportsLineups(
  competition: Pick<CompetitionDefinition, "capabilities"> | null | undefined
): boolean {
  return competition?.capabilities.lineups ?? true;
}

export function competitionSupportsFixtureEvents(
  competition: Pick<CompetitionDefinition, "capabilities"> | null | undefined
): boolean {
  return competition?.capabilities.fixtureEvents ?? true;
}

export function competitionSupportsFixtureStatistics(
  competition: Pick<CompetitionDefinition, "capabilities"> | null | undefined
): boolean {
  return competition?.capabilities.fixtureStatistics ?? true;
}

export function competitionSupportsPlayerPerformances(
  competition: Pick<CompetitionDefinition, "capabilities"> | null | undefined
): boolean {
  return competition?.capabilities.fixtureStatistics ?? true;
}
