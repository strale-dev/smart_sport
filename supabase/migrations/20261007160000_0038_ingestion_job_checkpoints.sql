-- 0038_ingestion_job_checkpoints.sql
-- Resumable cursor for bounded cron jobs (service role only).

create table if not exists public.ingestion_job_checkpoints (
  job_name   text primary key,
  cursor     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ingestion_job_checkpoints enable row level security;

comment on table public.ingestion_job_checkpoints is
  'Per-job ingestion cursor for resumable bounded cron runs.';
