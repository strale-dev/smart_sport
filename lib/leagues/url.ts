export const LEAGUE_TABS = [
  "overview",
  "standings",
  "fixtures",
  "top-scorers",
] as const;

export type LeagueTab = (typeof LEAGUE_TABS)[number];

export function parseLeagueTab(value: string | undefined): LeagueTab {
  if (value && LEAGUE_TABS.includes(value as LeagueTab)) {
    return value as LeagueTab;
  }

  return "overview";
}

export function parseLeagueSeason(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 2100) {
    return null;
  }

  return parsed;
}

type BuildLeagueHrefOptions = {
  tab?: LeagueTab;
  season?: number | null;
};

export function buildLeagueHref(
  leagueId: number,
  options?: BuildLeagueHrefOptions
): string {
  const params = new URLSearchParams();

  if (options?.season != null) {
    params.set("season", String(options.season));
  }

  if (options?.tab && options.tab !== "overview") {
    params.set("tab", options.tab);
  }

  const query = params.toString();
  return query ? `/leagues/${leagueId}?${query}` : `/leagues/${leagueId}`;
}
