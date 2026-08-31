/**
 * Normalized domain types for the provider/service layer (Phase 1 surface).
 * Analytics types (FormSnapshot, H2HSummary) live in Phase 3; DB insert shapes
 * are in types/domain-db.ts; generated row types are in types/supabase.ts.
 */
export type FixtureStatus =
  | "TBD"
  | "NS"
  | "1H"
  | "HT"
  | "2H"
  | "ET"
  | "BT"
  | "P"
  | "FT"
  | "AET"
  | "PEN"
  | "SUSP"
  | "INT"
  | "PST"
  | "CANC"
  | "ABD"
  | "AWD"
  | "WO"
  | "LIVE";

export type PlayerPosition = "GK" | "DF" | "MF" | "FW";
export type PlayerFoot = "LEFT" | "RIGHT" | "BOTH" | "UNKNOWN";

export type CountryRef = {
  externalId: string | null;
  code: string | null;
  name: string;
  flagUrl: string | null;
};

export type LeagueRef = {
  externalId: number;
  name: string;
  type: string | null;
  country: CountryRef | null;
  logoUrl: string | null;
};

export type VenueRef = {
  externalId: number | null;
  name: string;
  city: string | null;
  capacity: number | null;
  surface: string | null;
  imageUrl: string | null;
};

export type TeamRef = {
  externalId: number;
  name: string;
  code: string | null;
  logoUrl: string | null;
  isNational: boolean;
};

export type ScoreSnapshot = {
  home: number | null;
  away: number | null;
  halftimeHome: number | null;
  halftimeAway: number | null;
  fulltimeHome: number | null;
  fulltimeAway: number | null;
  extratimeHome: number | null;
  extratimeAway: number | null;
  penaltyHome: number | null;
  penaltyAway: number | null;
};

export type Fixture = {
  externalId: number;
  league: LeagueRef;
  seasonYear: number | null;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  kickoffAt: string;
  status: FixtureStatus;
  minute: number | null;
  score: ScoreSnapshot;
  venue: VenueRef | null;
  referee: string | null;
  round: string | null;
};

export type FixtureEvent = {
  externalEventId: string | null;
  minute: number;
  extraMinute: number | null;
  teamExternalId: number | null;
  playerExternalId: number | null;
  assistPlayerExternalId: number | null;
  type: string;
  detail: string | null;
  comments: string | null;
};

export type FixtureTeamStatistics = {
  teamExternalId: number;
  shotsTotal: number | null;
  shotsOnTarget: number | null;
  shotsOffTarget: number | null;
  shotsBlocked: number | null;
  shotsInsideBox: number | null;
  shotsOutsideBox: number | null;
  fouls: number | null;
  corners: number | null;
  offsides: number | null;
  ballPossession: number | null;
  yellowCards: number | null;
  redCards: number | null;
  goalkeeperSaves: number | null;
  totalPasses: number | null;
  passesAccurate: number | null;
  passesPercent: number | null;
  expectedGoals: number | null;
};

export type LineupPlayer = {
  playerExternalId: number | null;
  name: string;
  shirtNumber: number | null;
  position: string | null;
  grid: string | null;
  isStarting: boolean;
  isCaptain: boolean;
};

export type Lineup = {
  teamExternalId: number;
  formation: string | null;
  coachName: string | null;
  isConfirmed: boolean;
  players: LineupPlayer[];
};

export type FixturePlayerPerformance = {
  teamExternalId: number;
  playerExternalId: number;
  name: string;
  shirtNumber: number | null;
  position: string | null;
  minutes: number | null;
  rating: number | null;
  goals: number | null;
  assists: number | null;
  yellowCards: number | null;
  redCards: number | null;
};

export type Team = {
  externalId: number;
  name: string;
  code: string | null;
  country: CountryRef | null;
  founded: number | null;
  isNational: boolean;
  logoUrl: string | null;
  venue: VenueRef | null;
};

export type Player = {
  externalId: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  nationality: string | null;
  dateOfBirth: string | null;
  heightCm: number | null;
  weightKg: number | null;
  position: PlayerPosition | null;
  preferredFoot: PlayerFoot;
  photoUrl: string | null;
  currentTeam: TeamRef | null;
};

export type League = {
  externalId: number;
  name: string;
  type: string | null;
  country: CountryRef | null;
  logoUrl: string | null;
  isActive: boolean;
};

export type Season = {
  leagueExternalId: number;
  year: number;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
};

export type StandingRow = {
  rank: number;
  team: TeamRef;
  points: number | null;
  goalsDiff: number | null;
  groupName: string | null;
  form: string | null;
  played: number | null;
  win: number | null;
  draw: number | null;
  lose: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
};

export type StandingsGroup = {
  leagueExternalId: number;
  seasonYear: number;
  groupName: string | null;
  rows: StandingRow[];
};
