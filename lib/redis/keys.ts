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
  leagueFixturesFresh: 900,
  leagueFixturesStale: 86_400,
  leagueTopScorersFresh: 3_600,
  leagueTopScorersStale: 86_400,
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

/** UTC date strings only (YYYY-MM-DD), not request timestamps. */
export function providerFixturesRangeKey(
  fromDate: string,
  toDateExclusive: string
): string {
  return `provider:fixtures:range:${fromDate}:${toDateExclusive}`;
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

/** UTC date strings only (YYYY-MM-DD), not request timestamps. */
export function providerTeamFixturesKey(
  teamId: number,
  fromDate: string,
  toDateExclusive: string
): string {
  return `provider:team:${teamId}:fixtures:${fromDate}:${toDateExclusive}`;
}

export function providerTeamSquadKey(teamId: number): string {
  return `provider:team:${teamId}:squad`;
}

export function providerTeamStatisticsKey(
  teamId: number,
  leagueId: number,
  season: number
): string {
  return `provider:team:${teamId}:statistics:${leagueId}:${season}`;
}

export function providerPlayerKey(id: number): string {
  return `provider:player:${id}`;
}

export function providerPlayerStatsKey(id: number, season: number): string {
  return `provider:player:${id}:stats:${season}`;
}

export function providerPlayerFixturesKey(id: number, season: number): string {
  return `provider:player:${id}:fixtures:${season}`;
}

export function providerPlayerMatchHistoryKey(id: number): string {
  return `provider:player:${id}:match-history`;
}

export function providerPlayerTransfersKey(id: number): string {
  return `provider:player:${id}:transfers`;
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

export function providerLeagueFixturesKey(
  leagueId: number,
  season: number
): string {
  return `provider:league:${leagueId}:fixtures:${season}`;
}

export function providerLeagueTopScorersKey(
  leagueId: number,
  season: number
): string {
  return `provider:league:${leagueId}:top-scorers:${season}`;
}

export function providerLeagueTopAssistsKey(
  leagueId: number,
  season: number
): string {
  return `provider:league:${leagueId}:top-assists:${season}`;
}

export function providerLeagueTopYellowCardsKey(
  leagueId: number,
  season: number
): string {
  return `provider:league:${leagueId}:top-yellow-cards:${season}`;
}

export function providerLeagueTopRedCardsKey(
  leagueId: number,
  season: number
): string {
  return `provider:league:${leagueId}:top-red-cards:${season}`;
}

export function providerLeagueTopStatsKey(
  leagueId: number,
  season: number
): string {
  return `provider:league:${leagueId}:top-stats:${season}`;
}

export function analyticsFormKey(
  teamProviderId: number,
  scope: string,
  matches: number
): string {
  return `analytics:form:${teamProviderId}:${scope}:${matches}`;
}

export function analyticsH2hKey(
  teamAProviderId: number,
  teamBProviderId: number,
  scope: string,
  windowSize: number,
  leagueProviderId?: number | null
): string {
  const leaguePart =
    leagueProviderId != null ? `:league:${leagueProviderId}` : "";
  const [a, b] =
    teamAProviderId < teamBProviderId
      ? [teamAProviderId, teamBProviderId]
      : [teamBProviderId, teamAProviderId];
  return `analytics:h2h:${a}:${b}:${scope}:${windowSize}${leaguePart}`;
}

export function cacheLockKey(cacheKey: string): string {
  return `lock:cache:${cacheKey}`;
}

export function predictionPrematchLockKey(fixtureExternalId: number): string {
  return `lock:prediction:prematch:${fixtureExternalId}`;
}

export function aiPrematchInsightKey(
  fixtureExternalId: number,
  contextHash: string
): string {
  return `ai:insight:prematch:${fixtureExternalId}:${contextHash}`;
}

export function aiPrematchLockKey(fixtureExternalId: number): string {
  return `lock:ai:prematch:${fixtureExternalId}`;
}

export function aiUserDailyLimitKey(userId: string): string {
  return `ratelimit:user:${userId}:ai:day`;
}

export function fixtureFreshTtlSeconds(status?: FixtureStatus): number {
  if (status && isLiveFixtureStatus(status)) {
    return CACHE_TTL.fixtureLiveFresh;
  }

  return CACHE_TTL.fixtureNonLiveFresh;
}
