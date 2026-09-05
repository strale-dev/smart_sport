import { mapLeague, mapTeamRef } from "@/lib/api-football/adapter/fixture";
import { mapStandingRow } from "@/lib/api-football/adapter/entities";
import { parseNullableFloat } from "@/lib/api-football/adapter/utils";
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
import type { LeaguePlayerStats } from "@/lib/leagues/top-stats";

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

export function mapLeaguePlayerStats(
  raw: RawApiFootballPlayer
): LeaguePlayerStats {
  const stats = raw.statistics[0];

  if (!stats) {
    return {
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
      rating: null,
      shotsTotal: null,
      shotsOnTarget: null,
      keyPasses: null,
      passesTotal: null,
      tacklesTotal: null,
      interceptions: null,
      dribblesSuccess: null,
      yellowCards: null,
      redCards: null,
      saves: null,
      foulsCommitted: null,
    };
  }

  return {
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
    rating: parseNullableFloat(stats.games.rating),
    shotsTotal: stats.shots?.total ?? null,
    shotsOnTarget: stats.shots?.on ?? null,
    keyPasses: stats.passes?.key ?? null,
    passesTotal: stats.passes?.total ?? null,
    tacklesTotal: stats.tackles?.total ?? null,
    interceptions: stats.tackles?.interceptions ?? null,
    dribblesSuccess: stats.dribbles?.success ?? null,
    yellowCards: stats.cards?.yellow ?? null,
    redCards: stats.cards?.red ?? null,
    saves: stats.goals?.saves ?? null,
    foulsCommitted: stats.fouls?.committed ?? null,
  };
}

export function mapLeaguePlayerLeaderboardRow(
  raw: RawApiFootballPlayer,
  rank: number
): LeaguePlayerLeaderboardRow {
  return {
    rank,
    ...mapLeaguePlayerStats(raw),
  };
}
