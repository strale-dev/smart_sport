-- 0040_fixture_readiness.sql
-- Consolidate prematch_readiness + match_ingestion_state into fixture_readiness.
-- Extend is_live to include INT/SUSP (paused live tracking).

alter table public.fixtures
  add column if not exists fixture_readiness jsonb not null default '{}'::jsonb,
  add column if not exists fixture_readiness_updated_at timestamptz;

comment on column public.fixtures.fixture_readiness is
  'Versioned readiness snapshot: lifecycle phase, gates, dependency items, artifact freshness.';

comment on column public.fixtures.fixture_readiness_updated_at is
  'UTC timestamp when fixture_readiness was last evaluated.';

-- Best-effort backfill from legacy columns before drop.
update public.fixtures
set
  fixture_readiness = jsonb_build_object(
    'version', 1,
    'evaluatedAt', coalesce(
      prematch_readiness_updated_at,
      match_ingestion_updated_at,
      now()
    ),
    'timezonePolicy', 'Europe/Belgrade',
    'legacy', jsonb_build_object(
      'prematch_readiness', prematch_readiness,
      'match_ingestion_state', match_ingestion_state
    )
  ),
  fixture_readiness_updated_at = coalesce(
    prematch_readiness_updated_at,
    match_ingestion_updated_at,
    now()
  )
where
  (prematch_readiness is not null and prematch_readiness <> '{}'::jsonb)
  or match_ingestion_state is not null;

drop index if exists public.fixtures_prematch_readiness_ai_eligible_idx;

alter table public.fixtures
  drop column if exists prematch_readiness,
  drop column if exists prematch_readiness_updated_at,
  drop column if exists match_ingestion_state,
  drop column if exists match_ingestion_updated_at;

create index if not exists fixtures_fixture_readiness_ai_generation_idx
  on public.fixtures ((fixture_readiness->'gates'->>'aiGenerationAllowed'))
  where status in ('NS', 'TBD');

-- Recreate is_live generated column with INT/SUSP.
drop index if exists public.fixtures_is_live_idx;

alter table public.fixtures drop column if exists is_live;

alter table public.fixtures
  add column is_live boolean generated always as (
    status in ('1H','HT','2H','ET','BT','P','LIVE','INT','SUSP')
  ) stored;

create index if not exists fixtures_is_live_idx
  on public.fixtures (kickoff_at)
  where is_live;
