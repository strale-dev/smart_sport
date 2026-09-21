export type CompetitionTier = 1 | 2 | 3;

export type CompetitionCategory =
  | "domestic_league"
  | "domestic_cup"
  | "continental_club"
  | "national_team"
  | "international_other";

export type CompetitionCapabilities = {
  fixtures: boolean;
  standings: boolean;
  lineups: boolean;
  fixtureStatistics: boolean;
  fixtureEvents: boolean;
  teamSeasonStatistics: boolean;
  playerLeaderboards: boolean;
};

export type CompetitionDefinition = {
  providerId: number;
  name: string;
  countryName: string;
  countryCode: string | null;
  providerType: "League" | "Cup";
  category: CompetitionCategory;
  tier: CompetitionTier;
  enabled: boolean;
  capabilities: CompetitionCapabilities;
};

export type CompetitionRegistryFile = {
  generatedAt: string;
  source: "api-football/leagues";
  totalFromApi: number;
  enabledCount: number;
  competitions: CompetitionDefinition[];
};

export type RawRegistryLeagueEntry = {
  league: {
    id: number;
    name: string;
    type: string;
  };
  country: {
    name: string;
    code: string | null;
  };
  seasons: Array<{
    year: number;
    start: string | null;
    end: string | null;
    current: boolean;
  }>;
};
