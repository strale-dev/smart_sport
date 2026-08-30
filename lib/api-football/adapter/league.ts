import { mapLeague } from "@/lib/api-football/adapter/fixture";
import { mapStandingRow } from "@/lib/api-football/adapter/entities";
import type {
  RawApiFootballLeagueDetail,
  RawApiFootballStandingsGroup,
} from "@/lib/api-football/types";
import type { Season, StandingsGroup } from "@/types/domain";

export function mapSeason(
  raw: RawApiFootballLeagueDetail["seasons"][number],
  leagueExternalId: number
): Season {
  return {
    leagueExternalId,
    year: raw.year,
    startDate: raw.start || null,
    endDate: raw.end || null,
    isCurrent: raw.current,
  };
}

export function mapStandingsGroup(
  raw: RawApiFootballStandingsGroup
): StandingsGroup[] {
  const league = raw.league;

  return league.standings.map((group, index) => ({
    leagueExternalId: league.id,
    seasonYear: league.season,
    groupName: group[0]?.group || `group-${index + 1}`,
    rows: group.map(mapStandingRow),
  }));
}

export function mapLeagueDetail(raw: RawApiFootballLeagueDetail) {
  return {
    league: mapLeague({
      ...raw.league,
      country: raw.country,
    }),
    seasons: raw.seasons.map((season) => mapSeason(season, raw.league.id)),
  };
}
