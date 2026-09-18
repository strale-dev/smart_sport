import type { FixtureStatus, PlayerFoot, PlayerPosition } from "@/types/domain";

type Json = Record<string, unknown> | unknown[] | null;

export type CountryInsert = {
  provider_id: string | null;
  code: string | null;
  name: string;
  flag_url: string | null;
};

export type LeagueInsert = {
  provider_id: number;
  name: string;
  type: string | null;
  country_name: string | null;
  logo_url: string | null;
  is_active: boolean;
  provider_payload: Json;
};

export type SeasonInsert = {
  year: number;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  provider_payload: Json;
};

export type VenueInsert = {
  provider_id: number | null;
  name: string;
  city: string | null;
  capacity: number | null;
  surface: string | null;
  image_url: string | null;
};

export type TeamInsert = {
  provider_id: number;
  name: string;
  code: string | null;
  founded: number | null;
  is_national: boolean;
  logo_url: string | null;
  provider_payload: Json;
};

export type PlayerInsert = {
  provider_id: number;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  nationality: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  position: PlayerPosition | null;
  preferred_foot: PlayerFoot;
  photo_url: string | null;
  provider_payload: Json;
};

export type FixtureInsert = {
  provider_id: number;
  league_id: string;
  season_id?: string | null;
  home_team_id: string;
  away_team_id: string;
  venue_id?: string | null;
  round: string | null;
  referee: string | null;
  kickoff_at: string;
  status: FixtureStatus;
  minute: number | null;
  score_home: number | null;
  score_away: number | null;
  ht_home: number | null;
  ht_away: number | null;
  ft_home: number | null;
  ft_away: number | null;
  et_home: number | null;
  et_away: number | null;
  pen_home: number | null;
  pen_away: number | null;
  status_extra_minute?: number | null;
  period_first_start_at?: string | null;
  period_second_start_at?: string | null;
  last_provider_sync_at?: string | null;
  provider_payload: Json;
};

export type FixtureEventInsert = {
  provider_event_id: string | null;
  minute: number;
  extra_minute: number | null;
  type: string;
  detail: string | null;
  comments: string | null;
  provider_payload: Json;
};

export type FixtureStatisticsInsert = {
  shots_total: number | null;
  shots_on_target: number | null;
  shots_off_target: number | null;
  shots_blocked: number | null;
  shots_inside_box: number | null;
  shots_outside_box: number | null;
  fouls: number | null;
  corners: number | null;
  offsides: number | null;
  ball_possession: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  goalkeeper_saves: number | null;
  total_passes: number | null;
  passes_accurate: number | null;
  passes_percent: number | null;
  expected_goals: number | null;
  provider_payload: Json;
};

export type LineupInsert = {
  formation: string | null;
  coach_name: string | null;
  coach_provider_id: number | null;
  coach_photo_url: string | null;
  is_confirmed: boolean;
  provider_payload: Json;
};

export type LineupPlayerInsert = {
  shirt_number: number | null;
  position: string | null;
  grid: string | null;
  is_starting: boolean;
  is_captain: boolean;
  provider_payload: Json;
};

export type StandingInsert = {
  league_id: string;
  season_id: string;
  team_id: string;
  rank: number;
  points: number | null;
  goal_diff: number | null;
  group_name: string | null;
  form: string | null;
  played: number | null;
  win: number | null;
  draw: number | null;
  lose: number | null;
  goals_for: number | null;
  goals_against: number | null;
  provider_payload: Json;
};

export type FormSnapshotInsert = {
  team_id: string;
  scope: string;
  matches: number;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goals_for: number | null;
  goals_against: number | null;
  clean_sheets: number | null;
  failed_to_score: number | null;
  points: number | null;
  ppg: number | null;
};

export type H2hSummaryInsert = {
  team_a_id: string;
  team_b_id: string;
  scope: string;
  league_id: string | null;
  window_size: number;
  team_a_wins: number | null;
  team_b_wins: number | null;
  draws: number | null;
  team_a_goals: number | null;
  team_b_goals: number | null;
};
