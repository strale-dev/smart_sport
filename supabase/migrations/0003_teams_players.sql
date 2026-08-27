-- 0003_teams_players.sql
-- Teams, players, player_team_history, player_seasons.
-- Source of truth: docs/DB.md §5.5–5.8.

create table if not exists public.teams (
  id           uuid primary key default gen_random_uuid(),
  provider_id  integer not null unique,
  name         text not null,
  code         text,
  country_id   uuid references public.countries(id) on delete set null,
  founded      integer,
  is_national  boolean not null default false,
  logo_url     text,
  venue_id     uuid references public.venues(id) on delete set null,
  elo_rating   numeric(6,2) default 1500,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists teams_country_id_idx on public.teams (country_id);
create index if not exists teams_venue_id_idx   on public.teams (venue_id);
create index if not exists teams_name_trgm_idx  on public.teams using gin (name extensions.gin_trgm_ops);
create index if not exists teams_elo_idx        on public.teams (elo_rating desc);

create table if not exists public.players (
  id                    uuid primary key default gen_random_uuid(),
  provider_id           integer not null unique,
  first_name            text,
  last_name             text,
  full_name             text not null,
  nationality           text,
  country_id            uuid references public.countries(id) on delete set null,
  date_of_birth         date,
  height_cm             integer,
  weight_kg             integer,
  position              public.player_position,
  secondary_positions   public.player_position[],
  preferred_foot        public.player_foot default 'UNKNOWN',
  photo_url             text,
  market_value_amount   numeric(14,2),
  market_value_currency text,
  market_value_source   text,
  market_value_at       timestamptz,
  provider_payload      jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists players_country_id_idx     on public.players (country_id);
create index if not exists players_full_name_trgm_idx on public.players using gin (full_name extensions.gin_trgm_ops);
create index if not exists players_position_idx       on public.players (position);

create table if not exists public.player_team_history (
  id               uuid primary key default gen_random_uuid(),
  player_id        uuid not null references public.players(id) on delete cascade,
  team_id          uuid not null references public.teams(id)   on delete cascade,
  shirt_number     integer,
  joined_on        date,
  left_on          date,
  provider_payload jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists pth_player_id_idx on public.player_team_history (player_id);
create index if not exists pth_team_id_idx   on public.player_team_history (team_id);
create unique index if not exists pth_current_team_idx
  on public.player_team_history (player_id)
  where left_on is null;

create table if not exists public.player_seasons (
  id               uuid primary key default gen_random_uuid(),
  player_id        uuid not null references public.players(id) on delete cascade,
  team_id          uuid references public.teams(id) on delete set null,
  season_id        uuid not null references public.seasons(id) on delete cascade,
  appearances      integer,
  minutes          integer,
  goals            integer,
  assists          integer,
  yellow_cards     integer,
  red_cards        integer,
  average_rating   numeric(4,2),
  provider_payload jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (player_id, season_id, team_id)
);

create index if not exists ps_player_id_idx on public.player_seasons (player_id);
create index if not exists ps_season_id_idx on public.player_seasons (season_id);
create index if not exists ps_team_id_idx   on public.player_seasons (team_id);
