-- 0004_fixtures.sql
-- Fixtures, fixture events/statistics, lineups, lineup players, standings.
-- Source of truth: docs/DB.md §6.1–6.5, 6.7.

create table if not exists public.fixtures (
  id                    uuid primary key default gen_random_uuid(),
  provider_id           bigint not null unique,
  league_id             uuid not null references public.leagues(id) on delete cascade,
  season_id             uuid references public.seasons(id) on delete set null,
  round                 text,
  home_team_id          uuid not null references public.teams(id) on delete restrict,
  away_team_id          uuid not null references public.teams(id) on delete restrict,
  venue_id              uuid references public.venues(id) on delete set null,
  referee               text,
  kickoff_at            timestamptz not null,
  status                public.fixture_status not null default 'NS',
  minute                integer,
  score_home            integer,
  score_away            integer,
  ht_home               integer,
  ht_away               integer,
  ft_home               integer,
  ft_away               integer,
  et_home               integer,
  et_away               integer,
  pen_home              integer,
  pen_away              integer,
  is_live               boolean generated always as (status in ('1H','HT','2H','ET','BT','P','LIVE')) stored,
  active_viewers        integer not null default 0,
  last_provider_sync_at timestamptz,
  provider_payload      jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create index if not exists fixtures_league_id_idx    on public.fixtures (league_id);
create index if not exists fixtures_season_id_idx    on public.fixtures (season_id);
create index if not exists fixtures_kickoff_idx      on public.fixtures (kickoff_at);
create index if not exists fixtures_status_idx       on public.fixtures (status);
create index if not exists fixtures_is_live_idx      on public.fixtures (kickoff_at) where is_live;
create index if not exists fixtures_home_team_id_idx on public.fixtures (home_team_id);
create index if not exists fixtures_away_team_id_idx on public.fixtures (away_team_id);
create index if not exists fixtures_venue_id_idx     on public.fixtures (venue_id);
-- Note: kickoff_at is timestamptz. `::date` on timestamptz depends on the session
-- TimeZone and is therefore not IMMUTABLE, so it cannot be indexed directly.
-- We pin the cast to UTC via `at time zone 'UTC'`, which IS immutable, matching
-- the "matches on date X (UTC)" query pattern the app uses.
create index if not exists fixtures_date_kickoff_idx
  on public.fixtures (((kickoff_at at time zone 'UTC')::date), kickoff_at);

create table if not exists public.fixture_events (
  id                uuid primary key default gen_random_uuid(),
  fixture_id        uuid not null references public.fixtures(id) on delete cascade,
  provider_event_id text,
  minute            integer not null,
  extra_minute      integer,
  team_id           uuid references public.teams(id)   on delete set null,
  player_id         uuid references public.players(id) on delete set null,
  assist_player_id  uuid references public.players(id) on delete set null,
  type              text not null,
  detail            text,
  comments          text,
  provider_payload  jsonb,
  created_at        timestamptz not null default now(),
  unique (fixture_id, provider_event_id)
);

create index if not exists fixture_events_fixture_id_idx on public.fixture_events (fixture_id, minute, extra_minute);
create index if not exists fixture_events_team_id_idx    on public.fixture_events (team_id);
create index if not exists fixture_events_player_id_idx  on public.fixture_events (player_id);
create index if not exists fixture_events_type_idx       on public.fixture_events (type);

create table if not exists public.fixture_statistics (
  id                uuid primary key default gen_random_uuid(),
  fixture_id        uuid not null references public.fixtures(id) on delete cascade,
  team_id           uuid not null references public.teams(id)    on delete cascade,
  shots_total       integer,
  shots_on_target   integer,
  shots_off_target  integer,
  shots_blocked     integer,
  shots_inside_box  integer,
  shots_outside_box integer,
  fouls             integer,
  corners           integer,
  offsides          integer,
  ball_possession   integer,
  yellow_cards      integer,
  red_cards         integer,
  goalkeeper_saves  integer,
  total_passes      integer,
  passes_accurate   integer,
  passes_percent    integer,
  expected_goals    numeric(5,2),
  captured_at       timestamptz not null default now(),
  provider_payload  jsonb,
  updated_at        timestamptz not null default now(),
  unique (fixture_id, team_id)
);

create index if not exists fixture_stats_fixture_id_idx on public.fixture_statistics (fixture_id);
create index if not exists fixture_stats_team_id_idx    on public.fixture_statistics (team_id);

create table if not exists public.lineups (
  id               uuid primary key default gen_random_uuid(),
  fixture_id       uuid not null references public.fixtures(id) on delete cascade,
  team_id          uuid not null references public.teams(id)    on delete cascade,
  formation        text,
  coach_name       text,
  is_confirmed     boolean not null default false,
  provider_payload jsonb,
  captured_at      timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (fixture_id, team_id)
);

create index if not exists lineups_fixture_id_idx on public.lineups (fixture_id);
create index if not exists lineups_team_id_idx    on public.lineups (team_id);

create table if not exists public.lineup_players (
  id               uuid primary key default gen_random_uuid(),
  lineup_id        uuid not null references public.lineups(id) on delete cascade,
  player_id        uuid references public.players(id) on delete set null,
  shirt_number     integer,
  position         text,
  grid             text,
  is_starting      boolean not null default true,
  is_captain       boolean not null default false,
  provider_payload jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists lineup_players_lineup_id_idx on public.lineup_players (lineup_id);
create index if not exists lineup_players_player_id_idx on public.lineup_players (player_id);

create table if not exists public.standings (
  id               uuid primary key default gen_random_uuid(),
  league_id        uuid not null references public.leagues(id) on delete cascade,
  season_id        uuid not null references public.seasons(id) on delete cascade,
  team_id          uuid not null references public.teams(id)   on delete cascade,
  rank             integer,
  group_name       text,
  played           integer default 0,
  win              integer default 0,
  draw             integer default 0,
  lose             integer default 0,
  goals_for        integer default 0,
  goals_against    integer default 0,
  goal_diff        integer default 0,
  points           integer default 0,
  form             text,
  home_played      integer,
  home_win         integer,
  home_draw        integer,
  home_lose        integer,
  home_gf          integer,
  home_ga          integer,
  away_played      integer,
  away_win         integer,
  away_draw        integer,
  away_lose        integer,
  away_gf          integer,
  away_ga          integer,
  provider_payload jsonb,
  captured_at      timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (league_id, season_id, team_id, group_name)
);

create index if not exists standings_league_season_idx on public.standings (league_id, season_id, rank);
create index if not exists standings_team_id_idx       on public.standings (team_id);
