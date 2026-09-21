-- Sprint 2: goal market columns on predictions + post-match evaluation audit rows

alter table public.predictions
  add column if not exists expected_goals_total numeric(5,2),
  add column if not exists over2_prob numeric(5,4),
  add column if not exists over3_prob numeric(5,4);

comment on column public.predictions.expected_goals_total is
  'Poisson mean total goals (home + away) at prediction time';
comment on column public.predictions.over2_prob is
  'P(total goals > 2) from joint Poisson score matrix';
comment on column public.predictions.over3_prob is
  'P(total goals > 3) from joint Poisson score matrix';

create table if not exists public.prediction_evaluations (
  id                uuid primary key default gen_random_uuid(),
  fixture_id        uuid not null references public.fixtures(id) on delete cascade,
  prediction_id     uuid not null references public.predictions(id) on delete cascade,
  evaluated_at      timestamptz not null default now(),
  hit_1x2           boolean,
  hit_btts          boolean,
  hit_total_goals_range boolean,
  hit_weaker_scores boolean,
  hit_over2         boolean,
  hit_over3         boolean,
  actual_home_goals integer not null,
  actual_away_goals integer not null,
  details           jsonb,
  constraint prediction_evaluations_fixture_unique unique (fixture_id)
);

create index if not exists prediction_evaluations_prediction_idx
  on public.prediction_evaluations (prediction_id);

alter table public.prediction_evaluations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'prediction_evaluations'
      and policyname = 'prediction_evaluations_public_read'
  ) then
    create policy "prediction_evaluations_public_read"
      on public.prediction_evaluations
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;
