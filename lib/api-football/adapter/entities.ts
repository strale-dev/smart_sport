import { mapTeamRef, mapVenueRef } from "@/lib/api-football/adapter/fixture";
import {
  parseHeightCm,
  parseNullableFloat,
  parsePercent,
  parseWeightKg,
} from "@/lib/api-football/adapter/utils";
import type {
  RawApiFootballPlayer,
  RawApiFootballPlayerStatisticsEntry,
  RawApiFootballSearchPlayer,
  RawApiFootballPlayerProfile,
  RawApiFootballSearchTeam,
  RawApiFootballSquad,
  RawApiFootballStandingRow,
  RawApiFootballTeam,
  RawApiFootballTeamSeasonStatistics,
  RawApiFootballTransferEntry,
  RawApiFootballTransfers,
} from "@/lib/api-football/types";
import type {
  Player,
  PlayerCareerEntry,
  PlayerCareerEntryType,
  PlayerFoot,
  PlayerPosition,
  PlayerSeasonStatistics,
  SquadPlayer,
  StandingRow,
  Team,
  TeamSeasonStatistics,
} from "@/types/domain";

function mapPlayerPosition(
  value: string | null | undefined
): PlayerPosition | null {
  switch (value?.trim().toUpperCase()) {
    case "G":
    case "GK":
    case "GOALKEEPER":
      return "GK";
    case "D":
    case "DF":
    case "DEFENDER":
      return "DF";
    case "M":
    case "MF":
    case "MIDFIELDER":
      return "MF";
    case "F":
    case "FW":
    case "FORWARD":
    case "ATTACKER":
      return "FW";
    default:
      return null;
  }
}

function mapPlayerFoot(): PlayerFoot {
  return "UNKNOWN";
}

function emptyPlayerFields() {
  return {
    shirtNumber: null,
    marketValue: null,
    averageRating: null,
  } as const;
}

export function mapPlayerSeasonStatisticsEntry(
  raw: RawApiFootballPlayerStatisticsEntry
): PlayerSeasonStatistics {
  return {
    leagueExternalId: raw.league.id,
    leagueName: raw.league.name,
    seasonYear: raw.league.season,
    team: mapTeamRef(raw.team),
    appearances: raw.games.appearences ?? null,
    lineups: raw.games.lineups ?? null,
    minutes: raw.games.minutes,
    averageRating: parseNullableFloat(raw.games.rating),
    goals: raw.goals?.total ?? null,
    assists: raw.goals?.assists ?? null,
    saves: raw.goals?.saves ?? null,
    shotsTotal: raw.shots?.total ?? null,
    shotsOnTarget: raw.shots?.on ?? null,
    passesTotal: raw.passes?.total ?? null,
    passesAccuracy: parsePercent(raw.passes?.accuracy),
    keyPasses: raw.passes?.key ?? null,
    tacklesTotal: raw.tackles?.total ?? null,
    interceptions: raw.tackles?.interceptions ?? null,
    blocks: raw.tackles?.blocks ?? null,
    dribblesAttempted: raw.dribbles?.attempts ?? null,
    dribblesSuccess: raw.dribbles?.success ?? null,
    foulsCommitted: raw.fouls?.committed ?? null,
    foulsDrawn: raw.fouls?.drawn ?? null,
    yellowCards: raw.cards?.yellow ?? null,
    redCards: raw.cards?.red ?? null,
    penaltiesScored: raw.penalty?.scored ?? null,
    penaltiesMissed: raw.penalty?.missed ?? null,
    goalsConceded: raw.goals?.conceded ?? null,
  };
}

export function mapPlayerSeasonStatistics(
  raw: RawApiFootballPlayer
): PlayerSeasonStatistics[] {
  return raw.statistics.map(mapPlayerSeasonStatisticsEntry);
}

function mapTransferEntryType(type: string | null): PlayerCareerEntryType {
  const normalized = type?.trim().toLowerCase() ?? "";

  if (normalized.includes("loan")) {
    return "loan";
  }

  if (normalized.includes("free")) {
    return "free";
  }

  if (normalized.length > 0) {
    return "transfer";
  }

  return "inferred";
}

export function mapPlayerCareerFromTransfers(
  raw: RawApiFootballTransfers
): PlayerCareerEntry[] {
  const entries = new Map<number, PlayerCareerEntry>();

  for (const transfer of raw.transfers) {
    addCareerTeamEntry(
      entries,
      transfer.teams.in,
      transfer.date,
      null,
      transfer.type
    );
    addCareerTeamEntry(
      entries,
      transfer.teams.out,
      null,
      transfer.date,
      transfer.type
    );
  }

  return [...entries.values()].sort((a, b) => {
    const aDate = a.fromDate ?? a.toDate ?? "";
    const bDate = b.fromDate ?? b.toDate ?? "";
    return bDate.localeCompare(aDate);
  });
}

function addCareerTeamEntry(
  entries: Map<number, PlayerCareerEntry>,
  team: RawApiFootballTransferEntry["teams"]["in"],
  fromDate: string | null,
  toDate: string | null,
  transferType: string | null
): void {
  const existing = entries.get(team.id);

  if (existing) {
    entries.set(team.id, {
      ...existing,
      fromDate: pickEarliestDate(existing.fromDate, fromDate),
      toDate: pickLatestDate(existing.toDate, toDate),
      transferType: existing.transferType ?? transferType,
    });
    return;
  }

  entries.set(team.id, {
    team: mapTeamRef(team),
    fromDate,
    toDate,
    transferType,
    entryType: mapTransferEntryType(transferType),
  });
}

function pickEarliestDate(
  current: string | null,
  candidate: string | null
): string | null {
  if (!candidate) {
    return current;
  }

  if (!current) {
    return candidate;
  }

  return candidate < current ? candidate : current;
}

function pickLatestDate(
  current: string | null,
  candidate: string | null
): string | null {
  if (!candidate) {
    return current;
  }

  if (!current) {
    return candidate;
  }

  return candidate > current ? candidate : current;
}

export function mapPlayerCareerFromSeasonStatistics(
  stats: PlayerSeasonStatistics[]
): PlayerCareerEntry[] {
  const byTeam = new Map<number, PlayerCareerEntry>();

  for (const stat of stats) {
    const existing = byTeam.get(stat.team.externalId);

    if (existing) {
      continue;
    }

    byTeam.set(stat.team.externalId, {
      team: stat.team,
      fromDate: null,
      toDate: null,
      transferType: null,
      entryType: "inferred",
    });
  }

  return [...byTeam.values()];
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
    shirtNumber: currentStats?.games.number ?? null,
    marketValue: null,
    averageRating: parseNullableFloat(currentStats?.games.rating),
  };
}

export function mapPlayerProfile(raw: RawApiFootballPlayerProfile): Player {
  return {
    externalId: raw.player.id,
    firstName: raw.player.firstname,
    lastName: raw.player.lastname,
    fullName: raw.player.name,
    nationality: raw.player.nationality,
    dateOfBirth: raw.player.birth?.date ?? null,
    heightCm: parseHeightCm(raw.player.height),
    weightKg: parseWeightKg(raw.player.weight),
    position: mapPlayerPosition(raw.player.position),
    preferredFoot: mapPlayerFoot(),
    photoUrl: raw.player.photo,
    currentTeam: null,
    shirtNumber: raw.player.number ?? null,
    marketValue: null,
    averageRating: null,
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
    ...emptyPlayerFields(),
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

export function mapSquadPlayer(
  raw: RawApiFootballSquad["players"][number]
): SquadPlayer {
  return {
    externalId: raw.id,
    name: raw.name,
    age: raw.age,
    shirtNumber: raw.number,
    position: mapPlayerPosition(raw.position),
    photoUrl: raw.photo,
  };
}

export function mapTeamSquad(raw: RawApiFootballSquad): SquadPlayer[] {
  return raw.players.map(mapSquadPlayer);
}

export function mapTeamSeasonStatistics(
  raw: RawApiFootballTeamSeasonStatistics
): TeamSeasonStatistics {
  return {
    leagueExternalId: raw.league.id,
    seasonYear: raw.league.season,
    form: raw.form,
    fixturesPlayed: raw.fixtures.played.total,
    wins: raw.fixtures.wins.total,
    draws: raw.fixtures.draws.total,
    losses: raw.fixtures.loses.total,
    goalsFor: raw.goals.for.total.total,
    goalsAgainst: raw.goals.against.total.total,
    cleanSheets: raw.clean_sheet?.total ?? null,
    failedToScore: raw.failed_to_score?.total ?? null,
    averagePossession: raw.possession?.average?.total ?? null,
    shotsTotal: raw.shots?.total?.total ?? null,
    shotsOnTarget: raw.shots?.on?.total ?? null,
    passesTotal: raw.passes?.total?.total ?? null,
    passesAccuracy: raw.passes?.percentage?.total ?? null,
    tacklesTotal: raw.tackles?.total?.total ?? null,
    interceptions: raw.tackles?.interceptions?.total ?? null,
    yellowCards: raw.cards?.yellow?.total ?? null,
    redCards: raw.cards?.red?.total ?? null,
    foulsCommitted: raw.fouls?.committed?.total ?? null,
  };
}
