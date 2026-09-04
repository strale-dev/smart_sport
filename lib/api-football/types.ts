export type ApiFootballPaging = {
  current: number;
  total: number;
};

export type ApiFootballEnvelope<T> = {
  get: string;
  parameters: Record<string, string | number | boolean | null | undefined>;
  errors: Record<string, string> | string[] | unknown;
  results: number;
  paging: ApiFootballPaging;
  response: T;
};

export type RawApiFootballCountry = {
  name: string;
  code: string | null;
  flag: string | null;
};

export type RawApiFootballLeague = {
  id: number;
  name: string;
  type: string;
  logo: string | null;
  country?: RawApiFootballCountry;
};

export type RawApiFootballSeason = {
  year: number;
  start: string;
  end: string;
  current: boolean;
};

export type RawApiFootballVenue = {
  id: number | null;
  name: string | null;
  city: string | null;
  capacity: number | null;
  surface: string | null;
  image: string | null;
};

export type RawApiFootballTeam = {
  id: number;
  name: string;
  code: string | null;
  country: string | null;
  founded: number | null;
  national: boolean;
  logo: string | null;
  venue?: RawApiFootballVenue | null;
};

export type RawApiFootballFixtureStatus = {
  long: string;
  short: string;
  elapsed: number | null;
  extra: number | null;
};

export type RawApiFootballScorePart = {
  home: number | null;
  away: number | null;
};

export type RawApiFootballScore = {
  halftime: RawApiFootballScorePart;
  fulltime: RawApiFootballScorePart;
  extratime: RawApiFootballScorePart;
  penalty: RawApiFootballScorePart;
};

export type RawApiFootballFixture = {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number | null;
      second: number | null;
    };
    venue: RawApiFootballVenue;
    status: RawApiFootballFixtureStatus;
  };
  league: RawApiFootballLeague & {
    country: string;
    flag: string | null;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string | null;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string | null;
      winner: boolean | null;
    };
  };
  goals: RawApiFootballScorePart;
  score: RawApiFootballScore;
};

export type RawApiFootballEvent = {
  time: {
    elapsed: number;
    extra: number | null;
  };
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  player: {
    id: number | null;
    name: string | null;
  };
  assist: {
    id: number | null;
    name: string | null;
  };
  type: string;
  detail: string;
  comments: string | null;
};

export type RawApiFootballStatisticItem = {
  type: string;
  value: number | string | null;
};

export type RawApiFootballTeamStatistics = {
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  statistics: RawApiFootballStatisticItem[];
};

export type RawApiFootballLineupPlayer = {
  player: {
    id: number | null;
    name: string;
    number: number | null;
    pos: string | null;
    grid: string | null;
  };
};

export type RawApiFootballLineup = {
  team: {
    id: number;
    name: string;
    logo: string | null;
    colors?: Record<string, unknown> | null;
  };
  coach: {
    id: number | null;
    name: string | null;
    photo: string | null;
  };
  formation: string | null;
  startXI: RawApiFootballLineupPlayer[];
  substitutes: RawApiFootballLineupPlayer[];
};

export type RawApiFootballFixturePlayerStat = {
  games: {
    minutes: number | null;
    number: number | null;
    position: string | null;
    rating: string | null;
    captain: boolean;
    substitute: boolean;
  };
  offsides: number | null;
  shots: {
    total: number | null;
    on: number | null;
  };
  goals: {
    total: number | null;
    conceded: number | null;
    assists: number | null;
    saves: number | null;
  };
  passes: {
    total: number | null;
    key: number | null;
    accuracy: string | null;
  };
  tackles: {
    total: number | null;
    blocks: number | null;
    interceptions: number | null;
  };
  duels: {
    total: number | null;
    won: number | null;
  };
  dribbles: {
    attempts: number | null;
    success: number | null;
    past: number | null;
  };
  fouls: {
    drawn: number | null;
    committed: number | null;
  };
  cards: {
    yellow: number | null;
    red: number | null;
  };
  penalty: {
    won: number | null;
    commited: number | null;
    scored: number | null;
    missed: number | null;
    saved: number | null;
  };
};

export type RawApiFootballFixturePlayer = {
  team: {
    id: number;
    name: string;
    logo: string | null;
    update: string | null;
  };
  players: Array<{
    player: {
      id: number;
      name: string;
      photo: string | null;
    };
    statistics: RawApiFootballFixturePlayerStat[];
  }>;
};

export type RawApiFootballPlayerStatisticsEntry = Omit<
  RawApiFootballFixturePlayerStat,
  "games"
> & {
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  league: RawApiFootballLeague & {
    season: number;
  };
  games: RawApiFootballFixturePlayerStat["games"] & {
    appearences?: number | null;
    lineups?: number | null;
  };
};

export type RawApiFootballPlayer = {
  player: {
    id: number;
    name: string;
    firstname: string | null;
    lastname: string | null;
    age: number | null;
    birth: {
      date: string | null;
      place: string | null;
      country: string | null;
    };
    nationality: string | null;
    height: string | null;
    weight: string | null;
    injured: boolean;
    photo: string | null;
  };
  statistics: RawApiFootballPlayerStatisticsEntry[];
};

export type RawApiFootballTransferTeam = {
  id: number;
  name: string;
  logo: string | null;
};

export type RawApiFootballTransferEntry = {
  date: string;
  type: string | null;
  teams: {
    in: RawApiFootballTransferTeam;
    out: RawApiFootballTransferTeam;
  };
};

export type RawApiFootballTransfers = {
  player: {
    id: number;
    name: string;
  };
  update: string;
  transfers: RawApiFootballTransferEntry[];
};

export type RawApiFootballStandingTeam = {
  id: number;
  name: string;
  logo: string | null;
};

export type RawApiFootballStandingRow = {
  rank: number;
  team: RawApiFootballStandingTeam;
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  status: string | null;
  description: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
  update: string;
};

export type RawApiFootballStandingsGroup = {
  league: RawApiFootballLeague & {
    country: string;
    flag: string | null;
    season: number;
    standings: RawApiFootballStandingRow[][];
  };
};

export type RawApiFootballLeagueDetail = {
  league: RawApiFootballLeague;
  country: RawApiFootballCountry;
  seasons: RawApiFootballSeason[];
};

export type RawApiFootballTeamDetail = {
  team: RawApiFootballTeam;
  venue?: RawApiFootballVenue | null;
};

export type RawApiFootballSearchTeam = RawApiFootballTeamDetail;

export type RawApiFootballSearchPlayer = {
  player: RawApiFootballPlayer["player"];
};

export type RawApiFootballPlayerProfile = {
  player: RawApiFootballPlayer["player"] & {
    number?: number | null;
    position?: string | null;
  };
};

export type RawApiFootballTeamSeasonStatBucket = {
  home: number;
  away: number;
  total: number;
};

export type RawApiFootballTeamSeasonStatistics = {
  league: RawApiFootballLeague & {
    country: string;
    flag: string | null;
    season: number;
  };
  team: RawApiFootballTeam;
  form: string | null;
  fixtures: {
    played: RawApiFootballTeamSeasonStatBucket;
    wins: RawApiFootballTeamSeasonStatBucket;
    draws: RawApiFootballTeamSeasonStatBucket;
    loses: RawApiFootballTeamSeasonStatBucket;
  };
  goals: {
    for: {
      total: RawApiFootballTeamSeasonStatBucket;
    };
    against: {
      total: RawApiFootballTeamSeasonStatBucket;
    };
  };
  clean_sheet?: RawApiFootballTeamSeasonStatBucket;
  failed_to_score?: RawApiFootballTeamSeasonStatBucket;
  cards?: {
    yellow?: RawApiFootballTeamSeasonStatBucket;
    red?: RawApiFootballTeamSeasonStatBucket;
  };
  fouls?: {
    committed?: RawApiFootballTeamSeasonStatBucket;
  };
  shots?: {
    total?: RawApiFootballTeamSeasonStatBucket;
    on?: RawApiFootballTeamSeasonStatBucket;
  };
  passes?: {
    total?: RawApiFootballTeamSeasonStatBucket;
    percentage?: RawApiFootballTeamSeasonStatBucket;
  };
  tackles?: {
    total?: RawApiFootballTeamSeasonStatBucket;
    interceptions?: RawApiFootballTeamSeasonStatBucket;
  };
  possession?: {
    average?: RawApiFootballTeamSeasonStatBucket;
  };
};

export type RawApiFootballSquadPlayer = {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string | null;
  photo: string | null;
};

export type RawApiFootballSquad = {
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  players: RawApiFootballSquadPlayer[];
};
