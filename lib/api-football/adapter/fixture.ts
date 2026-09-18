import {
  mapFixtureStatus,
  parseNullableInt,
} from "@/lib/api-football/adapter/utils";
import type {
  RawApiFootballFixture,
  RawApiFootballLeague,
} from "@/lib/api-football/types";
import type {
  CountryRef,
  Fixture,
  League,
  LeagueRef,
  ScoreSnapshot,
  TeamRef,
  VenueRef,
} from "@/types/domain";

export function mapCountryRef(input: {
  name: string;
  code?: string | null;
  flag?: string | null;
}): CountryRef {
  return {
    externalId: input.code ?? null,
    code: input.code ?? null,
    name: input.name,
    flagUrl: input.flag ?? null,
  };
}

export function mapTeamRef(input: {
  id: number;
  name: string;
  logo?: string | null;
  code?: string | null;
  national?: boolean;
}): TeamRef {
  return {
    externalId: input.id,
    name: input.name,
    code: input.code ?? null,
    logoUrl: input.logo ?? null,
    isNational: Boolean(input.national),
  };
}

export function mapVenueRef(
  venue: RawApiFootballFixture["fixture"]["venue"] | null | undefined
): VenueRef | null {
  if (!venue?.name) {
    return null;
  }

  return {
    externalId: venue.id ?? null,
    name: venue.name,
    city: venue.city ?? null,
    capacity: venue.capacity ?? null,
    surface: venue.surface ?? null,
    imageUrl: venue.image ?? null,
  };
}

export function mapLeagueRef(
  league: RawApiFootballLeague & {
    country?:
      string | { name: string; code?: string | null; flag?: string | null };
    flag?: string | null;
  }
): LeagueRef {
  let country: CountryRef | null = null;

  if (typeof league.country === "string") {
    country = {
      externalId: null,
      code: null,
      name: league.country,
      flagUrl: league.flag ?? null,
    };
  } else if (league.country && typeof league.country === "object") {
    country = mapCountryRef(league.country);
  }

  return {
    externalId: league.id,
    name: league.name,
    type: league.type ?? null,
    country,
    logoUrl: league.logo ?? null,
  };
}

export function periodUnixSecondsToIso(
  unixSeconds: number | null | undefined
): string | null {
  if (unixSeconds == null) {
    return null;
  }
  return new Date(unixSeconds * 1000).toISOString();
}

export function mapFixtureLiveClockFromRaw(
  raw: RawApiFootballFixture,
  lastProviderSyncAt: string | null = null
): Fixture["liveClock"] {
  const periods = raw.fixture.periods;

  return {
    statusExtraMinute: parseNullableInt(raw.fixture.status?.extra),
    lastProviderSyncAt,
    periodFirstStartAt: periodUnixSecondsToIso(periods?.first),
    periodSecondStartAt: periodUnixSecondsToIso(periods?.second),
  };
}

function scorePart(
  part: { home: number | null; away: number | null } | null | undefined
): { home: number | null; away: number | null } {
  return {
    home: part?.home ?? null,
    away: part?.away ?? null,
  };
}

export function mapScore(raw: RawApiFootballFixture): ScoreSnapshot {
  const goals = raw.goals ?? { home: null, away: null };

  return {
    home: goals.home ?? null,
    away: goals.away ?? null,
    halftimeHome: scorePart(raw.score?.halftime).home,
    halftimeAway: scorePart(raw.score?.halftime).away,
    fulltimeHome: scorePart(raw.score?.fulltime).home,
    fulltimeAway: scorePart(raw.score?.fulltime).away,
    extratimeHome: scorePart(raw.score?.extratime).home,
    extratimeAway: scorePart(raw.score?.extratime).away,
    penaltyHome: scorePart(raw.score?.penalty).home,
    penaltyAway: scorePart(raw.score?.penalty).away,
  };
}

export function mapFixture(raw: RawApiFootballFixture): Fixture {
  return {
    externalId: raw.fixture.id,
    league: mapLeagueRef(raw.league),
    seasonYear: raw.league.season ?? null,
    homeTeam: mapTeamRef(raw.teams.home),
    awayTeam: mapTeamRef(raw.teams.away),
    kickoffAt: raw.fixture.date,
    status: mapFixtureStatus(raw.fixture.status?.short),
    minute: raw.fixture.status?.elapsed ?? null,
    score: mapScore(raw),
    venue: mapVenueRef(raw.fixture.venue),
    referee: raw.fixture.referee,
    round: raw.league.round ?? null,
    liveClock: mapFixtureLiveClockFromRaw(raw),
  };
}

export function mapLeague(
  raw: RawApiFootballLeague & {
    country?: { name: string; code: string | null; flag: string | null };
  }
): League {
  return {
    externalId: raw.id,
    name: raw.name,
    type: raw.type ?? null,
    country: raw.country ? mapCountryRef(raw.country) : null,
    logoUrl: raw.logo ?? null,
    isActive: true,
  };
}
