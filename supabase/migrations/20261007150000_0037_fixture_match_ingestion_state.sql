-- 0037_fixture_match_ingestion_state.sql
-- Per-fixture match-details ingestion outcomes (events, stats, lineups, performances).

alter table public.fixtures
  add column if not exists match_ingestion_state jsonb,
  add column if not exists match_ingestion_updated_at timestamptz;

comment on column public.fixtures.match_ingestion_state is
  'Latest dependency-level ingestion outcomes (SUCCESS/PARTIAL/SKIPPED/RETRYABLE/PERMANENT).';

comment on column public.fixtures.match_ingestion_updated_at is
  'UTC timestamp when match_ingestion_state was last updated.';
