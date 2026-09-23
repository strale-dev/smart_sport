export function buildSearchHref(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) {
    return "/search";
  }
  return `/search?q=${encodeURIComponent(trimmed)}`;
}

export function buildTeamSearchHref(providerId: number): string {
  return `/teams/${providerId}`;
}

export function buildPlayerSearchHref(providerId: number): string {
  return `/players/${providerId}`;
}

export function buildLeagueSearchHref(providerId: number): string {
  return `/leagues/${providerId}`;
}

export function buildMatchSearchHref(providerId: number): string {
  return `/matches/${providerId}`;
}
