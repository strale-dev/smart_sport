-- 0006_predictions_and_ai.sql
-- model_versions, predictions, ai_insights, ai_usage.
-- Source of truth: docs/DB.md §8.1, §8.2, §9.1, §9.2.

create table if not exists public.model_versions (
  id           uuid primary key default gen_random_uuid(),
  version      text not null unique,
  description  text,
  coefficients jsonb,
  released_at  timestamptz not null default now(),
  is_active    boolean not null default false
);

create index if not exists model_versions_active_idx on public.model_versions (is_active) where is_active;

create table if not exists public.predictions (
  id                        uuid primary key default gen_random_uuid(),
  fixture_id                uuid not null references public.fixtures(id) on delete cascade,
  model_version_id          uuid not null references public.model_versions(id) on delete restrict,
  type                      public.prediction_type not null,
  minute                    integer,
  home_win_prob             numeric(5,4) not null,
  draw_prob                 numeric(5,4) not null,
  away_win_prob             numeric(5,4) not null,
  expected_goals_home       numeric(5,2),
  expected_goals_away       numeric(5,2),
  expected_goals_total_min  numeric(5,2),
  expected_goals_total_max  numeric(5,2),
  btts_prob                 numeric(5,4),
  weaker_team_scoring_prob  numeric(5,4),
  confidence                public.ai_confidence not null,
  input_snapshot            jsonb not null,
  created_at                timestamptz not null default now(),
  check (abs(home_win_prob + draw_prob + away_win_prob - 1) < 0.01)
);

create index if not exists predictions_fixture_idx       on public.predictions (fixture_id, created_at desc);
create index if not exists predictions_type_idx          on public.predictions (type);
create index if not exists predictions_model_version_idx on public.predictions (model_version_id);
create index if not exists predictions_prematch_latest_idx
  on public.predictions (fixture_id, created_at desc)
  where type = 'PREMATCH';

create table if not exists public.ai_insights (
  id                          uuid primary key default gen_random_uuid(),
  fixture_id                  uuid references public.fixtures(id) on delete cascade,
  team_id                     uuid references public.teams(id)    on delete cascade,
  league_id                   uuid references public.leagues(id)  on delete cascade,
  type                        public.ai_insight_type not null,
  prediction_id               uuid references public.predictions(id) on delete set null,
  context_hash                text not null,
  openai_model                text not null,
  prompt_version              text not null,
  summary                     text,
  advantage                   public.ai_advantage,
  win_outcome                 public.ai_win_outcome,
  win_probabilities           jsonb,
  expected_goals_range        int4range,
  weaker_team_scoring_chance  numeric(5,4),
  confidence                  public.ai_confidence not null,
  key_factors                 jsonb,
  scenarios                   jsonb,
  commentary                  text,
  data_timestamp              timestamptz not null,
  data_quality                public.ai_data_quality not null,
  raw_output                  jsonb not null,
  validated                   boolean not null default true,
  tokens_input                integer,
  tokens_output               integer,
  cost_usd                    numeric(10,6),
  created_at                  timestamptz not null default now()
);

create index if not exists ai_insights_fixture_idx      on public.ai_insights (fixture_id, created_at desc);
create index if not exists ai_insights_type_idx         on public.ai_insights (type);
create index if not exists ai_insights_context_hash_idx on public.ai_insights (context_hash);
create unique index if not exists ai_insights_fixture_type_hash_idx
  on public.ai_insights (fixture_id, type, context_hash)
  where fixture_id is not null;

create table if not exists public.ai_usage (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  usage_day              date not null,
  ai_predictions_count   integer not null default 0,
  ai_deep_analyses_count integer not null default 0,
  ai_generations_count   integer not null default 0,
  live_ai_matches        uuid[] not null default '{}',
  last_live_ai_at        jsonb not null default '{}'::jsonb,
  updated_at             timestamptz not null default now(),
  unique (user_id, usage_day)
);

create index if not exists ai_usage_user_idx on public.ai_usage (user_id, usage_day desc);
