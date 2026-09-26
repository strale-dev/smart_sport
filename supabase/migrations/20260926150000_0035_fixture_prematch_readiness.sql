-- Fixture-level prematch ingestion / AI readiness (Phase 2 RCA).

alter table public.fixtures
  add column if not exists prematch_readiness jsonb not null default '{}'::jsonb,
  add column if not exists prematch_readiness_updated_at timestamptz;

comment on column public.fixtures.prematch_readiness is
  'Snapshot: aiEligible, hasMinimumModelSignal, reasons[], evaluatedAt';

create index if not exists fixtures_prematch_readiness_ai_eligible_idx
  on public.fixtures ((prematch_readiness->>'aiEligible'))
  where status in ('NS', 'TBD');
