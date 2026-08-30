import { mapTeamRef, mapVenueRef } from "@/lib/api-football/adapter/fixture";
import { parseHeightCm, parseWeightKg } from "@/lib/api-football/adapter/utils";
import type {
  RawApiFootballPlayer,
  RawApiFootballSearchPlayer,
  RawApiFootballSearchTeam,
  RawApiFootballStandingRow,
  RawApiFootballTeam,
} from "@/lib/api-football/types";
import type {
  Player,
  PlayerFoot,
  PlayerPosition,
  StandingRow,
  Team,
} from "@/types/domain";

function mapPlayerPosition(
  value: string | null | undefined
): PlayerPosition | null {
  switch (value?.toUpperCase()) {
    case "G":
    case "GK":
      return "GK";
    case "D":
    case "DF":
      return "DF";
    case "M":
    case "MF":
      return "MF";
    case "F":
    case "FW":
      return "FW";
    default:
      return null;
  }
}

function mapPlayerFoot(): PlayerFoot {
  return "UNKNOWN";
}

export function mapTeam(
  raw: RawApiFootballTeam,
  venue?: RawApiFootballTeam["venue"]
): Team {
  return {
    externalId: raw.id,
    name: raw.name,
    code: raw.code,
    country: raw.country
      ? {
          externalId: null,
          code: null,
          name: raw.country,
          flagUrl: null,
        }
      : null,
    founded: raw.founded,
    isNational: raw.national,
    logoUrl: raw.logo,
    venue: venue
      ? mapVenueRef(venue)
      : raw.venue
        ? mapVenueRef(raw.venue)
        : null,
  };
}

export function mapSearchTeam(raw: RawApiFootballSearchTeam): Team {
  return mapTeam(raw.team, raw.venue ?? undefined);
}

export function mapPlayer(raw: RawApiFootballPlayer): Player {
  const currentStats = raw.statistics[0];

  return {
    externalId: raw.player.id,
    firstName: raw.player.firstname,
    lastName: raw.player.lastname,
    fullName: raw.player.name,
    nationality: raw.player.nationality,
    dateOfBirth: raw.player.birth.date,
    heightCm: parseHeightCm(raw.player.height),
    weightKg: parseWeightKg(raw.player.weight),
    position: mapPlayerPosition(currentStats?.games.position),
    preferredFoot: mapPlayerFoot(),
    photoUrl: raw.player.photo,
    currentTeam: currentStats?.team ? mapTeamRef(currentStats.team) : null,
  };
}

export function mapSearchPlayer(raw: RawApiFootballSearchPlayer): Player {
  return {
    externalId: raw.player.id,
    firstName: raw.player.firstname,
    lastName: raw.player.lastname,
    fullName: raw.player.name,
    nationality: raw.player.nationality,
    dateOfBirth: raw.player.birth.date,
    heightCm: parseHeightCm(raw.player.height),
    weightKg: parseWeightKg(raw.player.weight),
    position: null,
    preferredFoot: mapPlayerFoot(),
    photoUrl: raw.player.photo,
    currentTeam: null,
  };
}

export function mapStandingRow(raw: RawApiFootballStandingRow): StandingRow {
  return {
    rank: raw.rank,
    team: mapTeamRef(raw.team),
    points: raw.points,
    goalsDiff: raw.goalsDiff,
    groupName: raw.group || null,
    form: raw.form,
    played: raw.all.played,
    win: raw.all.win,
    draw: raw.all.draw,
    lose: raw.all.lose,
    goalsFor: raw.all.goals.for,
    goalsAgainst: raw.all.goals.against,
  };
}
