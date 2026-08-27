-- 0002_football_reference.sql
-- Countries, leagues, seasons, venues.
-- Source of truth: docs/DB.md §5.1–5.4.

create table if not exists public.countries (
  id            uuid primary key default gen_random_uuid(),
  provider_id   text unique,
  code          text unique,
  name          text not null,
  flag_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.leagues (
  id             uuid primary key default gen_random_uuid(),
  provider_id    integer not null unique,
  name           text not null,
  type           text,
  country_id     uuid references public.countries(id) on delete set null,
  country_name   text,
  logo_url       text,
  prestige_score numeric(5,2) default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists leagues_country_id_idx  on public.leagues (country_id);
create index if not exists leagues_provider_id_idx on public.leagues (provider_id);
create index if not exists leagues_prestige_idx    on public.leagues (prestige_score desc);

create table if not exists public.seasons (
  id               uuid primary key default gen_random_uuid(),
  league_id        uuid not null references public.leagues(id) on delete cascade,
  year             integer not null,
  start_date       date,
  end_date         date,
  is_current       boolean not null default false,
  provider_payload jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (league_id, year)
);

create index if not exists seasons_league_id_idx  on public.seasons (league_id);
create index if not exists seasons_is_current_idx on public.seasons (is_current) where is_current;

create table if not exists public.venues (
  id           uuid primary key default gen_random_uuid(),
  provider_id  integer unique,
  name         text not null,
  city         text,
  country_id   uuid references public.countries(id) on delete set null,
  capacity     integer,
  surface      text,
  image_url    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists venues_country_id_idx on public.venues (country_id);
