-- Team history query performance + repair checkpoint metadata.

create index if not exists fixtures_home_team_completed_kickoff_idx
  on public.fixtures (home_team_id, kickoff_at desc)
  where status in ('FT', 'AET', 'PEN')
    and score_home is not null
    and score_away is not null;

create index if not exists fixtures_away_team_completed_kickoff_idx
  on public.fixtures (away_team_id, kickoff_at desc)
  where status in ('FT', 'AET', 'PEN')
    and score_home is not null
    and score_away is not null;

alter table public.ingestion_team_sync_state
  add column if not exists last_repair_season_year integer,
  add column if not exists history_state jsonb,
  add column if not exists min_finished_target integer not null default 30;
