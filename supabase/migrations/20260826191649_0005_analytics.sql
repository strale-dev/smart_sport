-- 0005_analytics.sql
-- Player match performances, form snapshots, h2h summaries.
-- Source of truth: docs/DB.md §6.6, §7.1, §7.2.

create table if not exists public.player_match_performances (
  id                uuid primary key default gen_random_uuid(),
  fixture_id        uuid not null references public.fixtures(id) on delete cascade,
  player_id         uuid not null references public.players(id)  on delete cascade,
  team_id           uuid references public.teams(id) on delete set null,
  minutes           integer,
  rating            numeric(4,2),
  goals             integer default 0,
  assists           integer default 0,
  shots_total       integer default 0,
  shots_on_target   integer default 0,
  passes            integer default 0,
  key_passes        integer default 0,
  yellow_cards      integer default 0,
  red_cards         integer default 0,
  saves             integer default 0,
  was_captain       boolean default false,
  was_starter       boolean default false,
  is_motm           boolean default false,
  provider_payload  jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (fixture_id, player_id)
);

create index if not exists pmp_fixture_id_idx on public.player_match_performances (fixture_id);
create index if not exists pmp_player_id_idx  on public.player_match_performances (player_id);
create index if not exists pmp_team_id_idx    on public.player_match_performances (team_id);

create table if not exists public.form_snapshots (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  scope           text not null,
  matches         integer not null,
  wins            integer,
  draws           integer,
  losses          integer,
  goals_for       integer,
  goals_against   integer,
  clean_sheets    integer,
  failed_to_score integer,
  points          integer,
  ppg             numeric(4,2),
  xg_for          numeric(6,2),
  xg_against      numeric(6,2),
  captured_at     timestamptz not null default now(),
  unique (team_id, scope, matches, captured_at)
);

create index if not exists form_snapshots_team_scope_idx
  on public.form_snapshots (team_id, scope, matches, captured_at desc);

create table if not exists public.h2h_summaries (
  id           uuid primary key default gen_random_uuid(),
  team_a_id    uuid not null references public.teams(id) on delete cascade,
  team_b_id    uuid not null references public.teams(id) on delete cascade,
  scope        text not null,
  league_id    uuid references public.leagues(id) on delete set null,
  window_size  integer not null,
  team_a_wins  integer,
  team_b_wins  integer,
  draws        integer,
  team_a_goals integer,
  team_b_goals integer,
  captured_at  timestamptz not null default now(),
  check (team_a_id < team_b_id)
);

create index if not exists h2h_pair_idx on public.h2h_summaries (team_a_id, team_b_id, scope);
