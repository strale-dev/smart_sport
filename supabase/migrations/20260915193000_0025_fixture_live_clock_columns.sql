-- Live match clock metadata from API-Football (status.extra, period start timestamps).
alter table public.fixtures
  add column if not exists status_extra_minute integer,
  add column if not exists period_first_start_at timestamptz,
  add column if not exists period_second_start_at timestamptz;
