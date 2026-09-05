import { mapLeague, mapTeamRef } from "@/lib/api-football/adapter/fixture";
import { mapStandingRow } from "@/lib/api-football/adapter/entities";
import type {
  RawApiFootballLeagueDetail,
  RawApiFootballPlayer,
  RawApiFootballStandingsGroup,
} from "@/lib/api-football/types";
import type {
  LeaguePlayerLeaderboardRow,
  Season,
  StandingsGroup,
} from "@/types/domain";

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

export function mapLeaguePlayerLeaderboardRow(
  raw: RawApiFootballPlayer,
  rank: number
): LeaguePlayerLeaderboardRow {
  const stats = raw.statistics[0];

  if (!stats) {
    return {
      rank,
      player: {
        externalId: raw.player.id,
        fullName: raw.player.name,
        photoUrl: raw.player.photo,
      },
      team: {
        externalId: 0,
        name: "Unknown",
        code: null,
        logoUrl: null,
        isNational: false,
      },
      goals: null,
      assists: null,
      appearances: null,
      minutes: null,
    };
  }

  return {
    rank,
    player: {
      externalId: raw.player.id,
      fullName: raw.player.name,
      photoUrl: raw.player.photo,
    },
    team: mapTeamRef(stats.team),
    goals: stats.goals?.total ?? null,
    assists: stats.goals?.assists ?? null,
    appearances: stats.games.appearences ?? stats.games.lineups ?? null,
    minutes: stats.games.minutes ?? null,
  };
}
