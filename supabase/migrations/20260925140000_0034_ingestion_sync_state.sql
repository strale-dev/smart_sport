-- Ingestion checkpoints for historical / league-season sync (service role only).

create table if not exists public.ingestion_sync_runs (
  id                uuid primary key default gen_random_uuid(),
  job_name          text not null,
  tier              smallint,
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  status            text not null default 'running',
  stats             jsonb not null default '{}'::jsonb,
  error_message     text
);

create index if not exists ingestion_sync_runs_job_started_idx
  on public.ingestion_sync_runs (job_name, started_at desc);

create table if not exists public.ingestion_league_season_state (
  league_provider_id bigint not null,
  season_year        integer not null,
  last_sync_at       timestamptz,
  fixtures_upserted  integer not null default 0,
  api_requests       integer not null default 0,
  status             text not null default 'pending',
  error_message      text,
  primary key (league_provider_id, season_year)
);

create index if not exists ingestion_league_season_state_status_idx
  on public.ingestion_league_season_state (status, last_sync_at);

create table if not exists public.ingestion_team_sync_state (
  team_provider_id   bigint primary key,
  finished_count     integer not null default 0,
  upcoming_count     integer not null default 0,
  last_gap_fill_at   timestamptz,
  seasons_covered    integer not null default 0,
  updated_at         timestamptz not null default now()
);

alter table public.ingestion_sync_runs enable row level security;
alter table public.ingestion_league_season_state enable row level security;
alter table public.ingestion_team_sync_state enable row level security;

-- Service role bypasses RLS; no policies for anon/authenticated.

create index if not exists fixtures_home_team_kickoff_desc_idx
  on public.fixtures (home_team_id, kickoff_at desc);

create index if not exists fixtures_away_team_kickoff_desc_idx
  on public.fixtures (away_team_id, kickoff_at desc);
