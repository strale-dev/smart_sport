import { selectStandingsGroupForTeam } from "@/lib/standings/select-team-group";
import type {
  Fixture,
  Season,
  StandingRow,
  StandingsGroup,
} from "@/types/domain";

export type TeamPrimaryLeague = {
  leagueExternalId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  seasonYear: number | null;
};

export type TeamPrimaryContext = TeamPrimaryLeague & {
  standingRow: StandingRow | null;
};

function modeSeasonYear(values: Array<number | null>): number | null {
  const counts = new Map<number, number>();

  for (const value of values) {
    if (value == null) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return null;
  }

  let bestYear: number | null = null;
  let bestCount = -1;

  for (const [year, count] of counts.entries()) {
    if (
      count > bestCount ||
      (count === bestCount && bestYear != null && year < bestYear)
    ) {
      bestYear = year;
      bestCount = count;
    }
  }

  return bestYear;
}

function isLeagueCompetition(fixture: Fixture): boolean {
  return fixture.league.type?.toLowerCase() === "league";
}

function resolvePrimaryLeagueFromFixtureList(
  fixtures: Fixture[]
): TeamPrimaryLeague | null {
  if (fixtures.length === 0) {
    return null;
  }

  const leagueCounts = new Map<
    number,
    {
      count: number;
      name: string;
      logoUrl: string | null;
      seasonYears: number[];
    }
  >();

  for (const fixture of fixtures) {
    const leagueId = fixture.league.externalId;
    const existing = leagueCounts.get(leagueId);

    if (existing) {
      existing.count += 1;
      if (fixture.seasonYear != null) {
        existing.seasonYears.push(fixture.seasonYear);
      }
      continue;
    }

    leagueCounts.set(leagueId, {
      count: 1,
      name: fixture.league.name,
      logoUrl: fixture.league.logoUrl,
      seasonYears: fixture.seasonYear != null ? [fixture.seasonYear] : [],
    });
  }

  let dominantLeagueId: number | null = null;
  let dominantMeta:
    (typeof leagueCounts extends Map<number, infer V> ? V : never) | null =
    null;

  for (const [leagueId, meta] of leagueCounts.entries()) {
    if (
      dominantMeta == null ||
      meta.count > dominantMeta.count ||
      (meta.count === dominantMeta.count &&
        dominantLeagueId != null &&
        leagueId < dominantLeagueId)
    ) {
      dominantLeagueId = leagueId;
      dominantMeta = meta;
    }
  }

  if (dominantLeagueId == null || dominantMeta == null) {
    return null;
  }

  return {
    leagueExternalId: dominantLeagueId,
    leagueName: dominantMeta.name,
    leagueLogoUrl: dominantMeta.logoUrl,
    seasonYear: modeSeasonYear(dominantMeta.seasonYears),
  };
}

function isNationalTeamFixture(fixture: Fixture): boolean {
  return fixture.homeTeam.isNational || fixture.awayTeam.isNational;
}

function isInternationalCompetition(fixture: Fixture): boolean {
  const countryName = fixture.league.country?.name?.toLowerCase();
  return countryName === "world";
}

export function resolvePrimaryLeagueFromFixtures(
  fixtures: Fixture[]
): TeamPrimaryLeague | null {
  const hasNationalContext = fixtures.some(isNationalTeamFixture);

  if (hasNationalContext) {
    const internationalFixtures = fixtures.filter(isInternationalCompetition);
    if (internationalFixtures.length > 0) {
      return resolvePrimaryLeagueFromFixtureList(internationalFixtures);
    }
  }

  const leagueFixtures = fixtures.filter(isLeagueCompetition);

  return resolvePrimaryLeagueFromFixtureList(
    leagueFixtures.length > 0 ? leagueFixtures : fixtures
  );
}

export function resolveSeasonYear(
  primaryLeague: TeamPrimaryLeague,
  seasons: Season[]
): number | null {
  if (primaryLeague.seasonYear != null) {
    return primaryLeague.seasonYear;
  }

  const currentSeason = seasons.find((season) => season.isCurrent);
  if (currentSeason) {
    return currentSeason.year;
  }

  return seasons[0]?.year ?? null;
}

export function findStandingRowForTeam(
  standings: StandingsGroup[],
  teamExternalId: number
): StandingRow | null {
  const group = selectStandingsGroupForTeam(standings, teamExternalId);

  if (!group) {
    return null;
  }

  return (
    group.rows.find((row) => row.team.externalId === teamExternalId) ?? null
  );
}

export function buildTeamPrimaryContext(
  fixtures: Fixture[],
  standings: StandingsGroup[],
  teamExternalId: number,
  seasons: Season[] = []
): TeamPrimaryContext | null {
  const primaryLeague = resolvePrimaryLeagueFromFixtures(fixtures);

  if (!primaryLeague) {
    return null;
  }

  const seasonYear = resolveSeasonYear(primaryLeague, seasons);

  return {
    ...primaryLeague,
    seasonYear,
    standingRow: findStandingRowForTeam(standings, teamExternalId),
  };
}

export function formatTeamStandingLabel(
  context: TeamPrimaryContext
): string | null {
  if (context.standingRow?.rank != null) {
    return `${ordinalRank(context.standingRow.rank)} in ${context.leagueName}`;
  }

  return context.leagueName;
}

function ordinalRank(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${rank}th`;
  }

  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}
