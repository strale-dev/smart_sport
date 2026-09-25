-- Near-term post-launch: web push + player biographies (idempotent)
-- Recorded on Scorence dev as migration version 20260924001536.

alter table public.user_preferences
  add column if not exists notify_push boolean not null default false,
  add column if not exists push_prompt_dismissed_at timestamptz;

do $$ begin
  create type public.player_bio_source as enum ('WIKIPEDIA');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.player_bio_fetch_status as enum (
    'OK',
    'NOT_FOUND',
    'AMBIGUOUS',
    'ERROR'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  endpoint        text not null,
  p256dh          text not null,
  auth            text not null,
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_success_at timestamptz,
  unique (endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions self all" on public.push_subscriptions;
create policy "push_subscriptions self all"
  on public.push_subscriptions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "push_subscriptions self select" on public.push_subscriptions;
create policy "push_subscriptions self select"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "push_subscriptions self insert" on public.push_subscriptions;
create policy "push_subscriptions self insert"
  on public.push_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "push_subscriptions self update" on public.push_subscriptions;
create policy "push_subscriptions self update"
  on public.push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "push_subscriptions self delete" on public.push_subscriptions;
create policy "push_subscriptions self delete"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.player_biographies (
  player_id     uuid primary key references public.players(id) on delete cascade,
  source        public.player_bio_source not null default 'WIKIPEDIA',
  page_title    text,
  page_url      text,
  excerpt       text,
  license_note  text not null default 'Content from Wikipedia, licensed under CC BY-SA 4.0.',
  fetch_status  public.player_bio_fetch_status not null,
  fetched_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists player_biographies_fetch_status_idx
  on public.player_biographies (fetch_status);

create index if not exists player_biographies_status_idx
  on public.player_biographies (fetch_status);

alter table public.player_biographies enable row level security;

drop policy if exists "player_biographies public read" on public.player_biographies;
create policy "player_biographies public read"
  on public.player_biographies for select
  to anon, authenticated
  using (true);
