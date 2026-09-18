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

export type PlayerRef = {
  externalId: number;
  fullName: string;
  photoUrl: string | null;
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

/** Authoritative live clock fields synced from the provider (for local client tick). */
export type FixtureLiveClock = {
  statusExtraMinute: number | null;
  lastProviderSyncAt: string | null;
  periodFirstStartAt: string | null;
  periodSecondStartAt: string | null;
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
  liveClock?: FixtureLiveClock | null;
};

export type FixtureEvent = {
  externalEventId: string | null;
  minute: number;
  extraMinute: number | null;
  teamExternalId: number | null;
  playerExternalId: number | null;
  assistPlayerExternalId: number | null;
  playerName?: string | null;
  assistPlayerName?: string | null;
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
  photoUrl?: string | null;
};

export type Lineup = {
  teamExternalId: number;
  formation: string | null;
  coachName: string | null;
  coachExternalId?: number | null;
  coachPhotoUrl?: string | null;
  isConfirmed: boolean;
  players: LineupPlayer[];
};

export type FixtureSidelinedKind = "injury" | "suspension" | "other";

export type FixtureSidelinedPlayer = {
  teamExternalId: number;
  playerExternalId: number | null;
  name: string;
  kind: FixtureSidelinedKind;
  reason: string | null;
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
  saves: number | null;
  shotsTotal: number | null;
  shotsOnTarget: number | null;
  passes: number | null;
  keyPasses: number | null;
  wasStarter: boolean;
  wasCaptain: boolean;
};

export type PlayerMarketValue = {
  amount: number;
  currency: string;
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
  shirtNumber: number | null;
  marketValue: PlayerMarketValue | null;
  averageRating: number | null;
};

export type PlayerSeasonStatistics = {
  leagueExternalId: number;
  leagueName: string;
  seasonYear: number;
  team: TeamRef;
  appearances: number | null;
  lineups: number | null;
  minutes: number | null;
  averageRating: number | null;
  goals: number | null;
  assists: number | null;
  saves: number | null;
  shotsTotal: number | null;
  shotsOnTarget: number | null;
  passesTotal: number | null;
  passesAccuracy: number | null;
  keyPasses: number | null;
  tacklesTotal: number | null;
  interceptions: number | null;
  blocks: number | null;
  dribblesAttempted: number | null;
  dribblesSuccess: number | null;
  foulsCommitted: number | null;
  foulsDrawn: number | null;
  yellowCards: number | null;
  redCards: number | null;
  penaltiesScored: number | null;
  penaltiesMissed: number | null;
  goalsConceded: number | null;
};

export type PlayerContributionBadgeType =
  "goal" | "assist" | "yellow_card" | "red_card" | "clean_sheet" | "motm";

export type PlayerContributionBadge = {
  type: PlayerContributionBadgeType;
  minute: number | null;
};

export type PlayerMatchAppearance = {
  fixtureExternalId: number;
  kickoffAt: string;
  leagueExternalId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  homeScore: number | null;
  awayScore: number | null;
  status: FixtureStatus;
  teamExternalId: number;
  opponent: TeamRef;
  isHome: boolean;
  minutes: number | null;
  rating: number | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheet: boolean;
  isMotm: boolean;
  badges: PlayerContributionBadge[];
};

export type PlayerMatchHistoryPage = {
  items: PlayerMatchAppearance[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PlayerCareerEntryType = "transfer" | "loan" | "free" | "inferred";

export type PlayerCareerEntry = {
  team: TeamRef;
  fromDate: string | null;
  toDate: string | null;
  transferType: string | null;
  entryType: PlayerCareerEntryType;
};

export type League = {
  externalId: number;
  name: string;
  type: string | null;
  country: CountryRef | null;
  logoUrl: string | null;
  isActive: boolean;
};

export type LeagueDetail = {
  league: League;
  seasons: Season[];
};

export type LeaguePlayerLeaderboardRow = {
  rank: number;
  player: PlayerRef;
  team: TeamRef;
  goals: number | null;
  assists: number | null;
  appearances: number | null;
  minutes: number | null;
  rating: number | null;
  shotsTotal: number | null;
  shotsOnTarget: number | null;
  keyPasses: number | null;
  passesTotal: number | null;
  tacklesTotal: number | null;
  interceptions: number | null;
  dribblesSuccess: number | null;
  yellowCards: number | null;
  redCards: number | null;
  saves: number | null;
  foulsCommitted: number | null;
};

export type LeagueStatLeaderboard = {
  id: string;
  label: string;
  rows: LeaguePlayerLeaderboardRow[];
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

export type FormScope = "ALL" | "HOME" | "AWAY";
export type H2HScope = "ALL" | "SAME_COMP";

export type FormMatchResult = {
  fixtureExternalId: number;
  opponentName: string;
  kickoffAt: string;
  result: "W" | "D" | "L";
  goalsFor: number;
  goalsAgainst: number;
  isHome: boolean;
};

export type FormSnapshot = {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  ppg: number | null;
  matches: number;
  scope: FormScope;
  results: FormMatchResult[];
};

export type H2HMeeting = {
  fixtureExternalId: number;
  kickoffAt: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  leagueName: string | null;
};

export type H2HSummary = {
  teamAExternalId: number;
  teamBExternalId: number;
  teamAWins: number;
  teamBWins: number;
  draws: number;
  teamAGoals: number;
  teamBGoals: number;
  windowSize: number;
  scope: H2HScope;
  meetings: H2HMeeting[];
};

export type SquadPlayer = {
  externalId: number;
  name: string;
  age: number | null;
  shirtNumber: number | null;
  position: PlayerPosition | null;
  photoUrl: string | null;
};

export type TeamSeasonStatistics = {
  leagueExternalId: number;
  seasonYear: number;
  form: string | null;
  fixturesPlayed: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  cleanSheets: number | null;
  failedToScore: number | null;
  averagePossession: number | null;
  shotsTotal: number | null;
  shotsOnTarget: number | null;
  passesTotal: number | null;
  passesAccuracy: number | null;
  tacklesTotal: number | null;
  interceptions: number | null;
  yellowCards: number | null;
  redCards: number | null;
  foulsCommitted: number | null;
};
