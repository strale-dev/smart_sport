-- 0007_users.sql
-- profiles, user_preferences, and the handle_new_user() trigger.
-- Source of truth: docs/DB.md §10.1, §10.2, §16.2.

create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  email                extensions.citext not null,
  avatar_url           text,
  timezone             text not null default 'UTC',
  language             text not null default 'en',
  preferred_league_id  uuid references public.leagues(id) on delete set null,
  onboarding_completed boolean not null default false,
  is_deleted           boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists profiles_preferred_league_idx on public.profiles (preferred_league_id);
create index if not exists profiles_email_idx            on public.profiles (email);

create table if not exists public.user_preferences (
  user_id                     uuid primary key references public.profiles(id) on delete cascade,
  notify_goal                 boolean not null default true,
  notify_full_time            boolean not null default true,
  notify_lineup_confirmed     boolean not null default true,
  notify_prediction_shift     boolean not null default true,
  notify_ai_insight_refreshed boolean not null default false,
  sound_goal_enabled          boolean not null default false,
  sound_full_time_enabled     boolean not null default false,
  email_marketing_optin       boolean not null default false,
  updated_at                  timestamptz not null default now()
);

-- handle_new_user: creates profiles + user_preferences + entitlements on signup.
-- entitlements table is created in 0009_billing.sql, so this function is only
-- attached to auth.users AFTER that migration runs. We create the function here
-- and attach the trigger in 0009 to keep dependency ordering explicit.
-- search_path is set to `extensions` (never `public`) so the citext cast below
-- resolves; every public.* reference is fully qualified for safety.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = extensions
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email::extensions.citext, ''::extensions.citext),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1))
  );

  insert into public.user_preferences (user_id) values (new.id);
  insert into public.entitlements     (user_id, tier) values (new.id, 'FREE');

  return new;
end $$;
