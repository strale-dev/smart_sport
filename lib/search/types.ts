import type { FixtureStatus } from "@/types/domain";

export type SearchEntityType = "team" | "player" | "league" | "match";

export type SearchTeamHit = {
  type: "team";
  providerId: number;
  name: string;
  code: string | null;
  logoUrl: string | null;
  countryName: string | null;
  eloRating: number | null;
  href: string;
  score: number;
};

export type SearchPlayerHit = {
  type: "player";
  providerId: number;
  fullName: string;
  photoUrl: string | null;
  teamName: string | null;
  teamProviderId: number | null;
  href: string;
  score: number;
};

export type SearchLeagueHit = {
  type: "league";
  providerId: number;
  name: string;
  logoUrl: string | null;
  countryName: string | null;
  href: string;
  score: number;
};

export type SearchMatchHit = {
  type: "match";
  providerId: number;
  kickoffAt: string;
  status: FixtureStatus;
  scoreHome: number | null;
  scoreAway: number | null;
  home: {
    providerId: number;
    name: string;
    logoUrl: string | null;
  };
  away: {
    providerId: number;
    name: string;
    logoUrl: string | null;
  };
  league: {
    providerId: number;
    name: string;
    logoUrl: string | null;
  };
  href: string;
  score: number;
};

export type SearchHit =
  SearchTeamHit | SearchPlayerHit | SearchLeagueHit | SearchMatchHit;

export type SearchCategoryResults<T extends SearchHit> = {
  items: T[];
  total: number;
  hasMore: boolean;
};

export type GlobalSearchResponse = {
  query: string;
  topHit: SearchHit | null;
  teams: SearchCategoryResults<SearchTeamHit>;
  players: SearchCategoryResults<SearchPlayerHit>;
  leagues: SearchCategoryResults<SearchLeagueHit>;
  matches: SearchCategoryResults<SearchMatchHit>;
};

export type GlobalSearchMode = "palette" | "full";
