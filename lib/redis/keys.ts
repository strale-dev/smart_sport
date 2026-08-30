import type { FixtureStatus } from "@/types/domain";

export const CACHE_TTL = {
  fixturesLiveFresh: 20,
  fixturesLiveStale: 86_400,
  fixturesDateFresh: 600,
  fixturesDateStale: 86_400,
  fixtureLiveFresh: 45,
  fixtureNonLiveFresh: 600,
  fixtureStale: 86_400,
  fixtureEventsFresh: 45,
  fixtureEventsStale: 86_400,
  fixtureStatsFresh: 45,
  fixtureStatsStale: 86_400,
  fixtureLineupsFresh: 300,
  fixtureLineupsStale: 86_400,
  teamFresh: 86_400,
  teamStale: 604_800,
  playerFresh: 86_400,
  playerStale: 604_800,
  leagueFresh: 86_400,
  leagueStale: 604_800,
  standingsFresh: 1_200,
  standingsStale: 86_400,
  searchFresh: 600,
  searchStale: 86_400,
  seasonsFresh: 86_400,
  seasonsStale: 604_800,
} as const;

const LIVE_STATUSES = new Set<FixtureStatus>([
  "LIVE",
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
]);

export function isLiveFixtureStatus(status: FixtureStatus): boolean {
  return LIVE_STATUSES.has(status);
}

export function providerFixturesLiveKey(): string {
  return "provider:fixtures:live";
}

export function providerFixturesDateKey(date: string): string {
  return `provider:fixtures:date:${date}`;
}

export function providerFixtureKey(id: number): string {
  return `provider:fixture:${id}`;
}

export function providerFixtureEventsKey(fixtureId: number): string {
  return `provider:fixture:${fixtureId}:events`;
}

export function providerFixtureStatsKey(fixtureId: number): string {
  return `provider:fixture:${fixtureId}:stats`;
}

export function providerFixtureLineupsKey(fixtureId: number): string {
  return `provider:fixture:${fixtureId}:lineups`;
}

export function providerFixturePlayersKey(fixtureId: number): string {
  return `provider:fixture:${fixtureId}:players`;
}

export function providerTeamKey(id: number): string {
  return `provider:team:${id}`;
}

export function providerPlayerKey(id: number): string {
  return `provider:player:${id}`;
}

export function providerLeagueKey(id: number): string {
  return `provider:league:${id}`;
}

export function providerStandingsKey(leagueId: number, season: number): string {
  return `provider:league:${leagueId}:standings:${season}`;
}

export function providerSearchTeamsKey(query: string): string {
  return `provider:search:teams:${query.toLowerCase()}`;
}

export function providerSearchPlayersKey(query: string): string {
  return `provider:search:players:${query.toLowerCase()}`;
}

export function providerSeasonsKey(leagueId: number): string {
  return `provider:league:${leagueId}:seasons`;
}

export function cacheLockKey(cacheKey: string): string {
  return `lock:cache:${cacheKey}`;
}

export function fixtureFreshTtlSeconds(status?: FixtureStatus): number {
  if (status && isLiveFixtureStatus(status)) {
    return CACHE_TTL.fixtureLiveFresh;
  }

  return CACHE_TTL.fixtureNonLiveFresh;
}
