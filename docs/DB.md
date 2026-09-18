# Scorence — Database Schema

> Companion to [PRD.md](./PRD.md) and [Tech.md](./Tech.md).
> **Database:** Supabase Postgres (16+).
> **Version:** 1.0
> **Last updated:** 2026-08-26 (post-deploy sync)

---

## Table of contents

1. [Conventions](#1-conventions)
2. [Extensions](#2-extensions)
3. [Enums](#3-enums)
4. [Schema map (bird's-eye view)](#4-schema-map-birds-eye-view)
5. [Core football entities](#5-core-football-entities)
6. [Fixtures & match state](#6-fixtures--match-state)
7. [Analytics snapshots](#7-analytics-snapshots)
8. [Predictions](#8-predictions)
9. [AI insights & usage](#9-ai-insights--usage)
10. [Users, profiles & preferences](#10-users-profiles--preferences)
11. [Follows, favorites & notifications](#11-follows-favorites--notifications)
12. [Subscriptions & entitlements](#12-subscriptions--entitlements)
13. [Waitlist](#13-waitlist)
14. [Row Level Security policies](#14-row-level-security-policies)
15. [Indexes summary](#15-indexes-summary)
16. [Triggers & functions](#16-triggers--functions)
17. [Migration ordering](#17-migration-ordering)

---

## 1. Conventions

Following [Supabase Postgres best practices](../.agents/skills/supabase-postgres-best-practices/SKILL.md):

- **Lowercase, snake_case** identifiers (never quoted).
- **Plural table names** (`fixtures`, not `fixture`).
- **Primary key** is always `id`:
  - `uuid default gen_random_uuid()` for user-owned + AI/prediction rows (unpredictable, safe to expose).
  - `bigint` (identity) for very high-volume tables where UUID overhead matters (none in MVP; kept as an option).
  - **`provider_id` alongside `id`** on football entities that come from API-Football, so we can upsert deterministically.
- **Foreign keys** named `<referenced_table_singular>_id`.
- **Timestamps** stored as `timestamptz`; every mutable table has `created_at` and `updated_at` (defaulted + auto-updated by trigger).
- **Money** always as text with currency code, never `float`.
- **Enums** for closed, stable sets (statuses, tiers). Never for open-ended lists.
- **JSONB** for provider payload snapshots and AI outputs; **never** for data we query by field.
- **RLS enabled on every table with user data.**
- **Foreign key columns are always indexed** (Postgres does not do this automatically).
- **`(select auth.uid())`** used in RLS policies for query planner efficiency.
- **Extensions live in the `extensions` schema** (never `public`); reference types/operators as `extensions.citext`, `extensions.gin_trgm_ops`, etc.

---

## 2. Extensions

Install into the dedicated `extensions` schema (never `public`) — Supabase best practice; avoids namespace pollution and security-advisor warnings.

```sql
create schema if not exists extensions;

create extension if not exists "pgcrypto"           with schema extensions;  -- gen_random_uuid()
create extension if not exists "pg_trgm"            with schema extensions;  -- trigram search
create extension if not exists "citext"             with schema extensions;  -- case-insensitive email
create extension if not exists "unaccent"           with schema extensions;  -- diacritic-insensitive search
create extension if not exists "pg_stat_statements" with schema extensions;
```

When referencing extension types or operators in `public` tables/functions, use the schema-qualified form (e.g. `extensions.citext`, `extensions.gin_trgm_ops`).

Not included in MVP (deferred):

- `pgvector` — future "similar matches" feature.
- `pg_cron` — Vercel Cron is used instead.

---

## 3. Enums

```sql
create type app_tier as enum ('FREE', 'PREMIUM');

create type subscription_status as enum (
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELLED',
  'EXPIRED'
);

create type fixture_status as enum (
  'TBD',           -- scheduled but no exact time yet
  'NS',            -- not started
  '1H',            -- first half
  'HT',            -- half-time
  '2H',            -- second half
  'ET',            -- extra time
  'BT',            -- break time (between ET periods)
  'P',             -- penalty in progress
  'FT',            -- full time
  'AET',           -- ended after extra time
  'PEN',           -- ended on penalties
  'SUSP',          -- suspended
  'INT',           -- interrupted
  'PST',           -- postponed
  'CANC',          -- cancelled
  'ABD',           -- abandoned
  'AWD',           -- awarded
  'WO',            -- walkover
  'LIVE'           -- catch-all live (API-Football also uses this)
);

create type prediction_type as enum ('PREMATCH', 'LIVE');

create type ai_insight_type as enum ('PREMATCH', 'LIVE', 'DEEP', 'LEAGUE_SUMMARY', 'TEAM_SUMMARY');
create type ai_confidence as enum ('LOW', 'MEDIUM', 'HIGH');
create type ai_data_quality as enum ('COMPLETE', 'PARTIAL', 'STALE');
create type ai_advantage as enum ('HOME', 'DRAW', 'AWAY', 'EVEN');
create type ai_win_outcome as enum ('1', 'X', '2');

create type follow_object as enum ('TEAM', 'PLAYER', 'LEAGUE');
create type notification_channel as enum ('IN_APP', 'EMAIL', 'PUSH');
create type notification_kind as enum (
  'GOAL_FOR_FOLLOWED_TEAM',
  'FULL_TIME_FOLLOWED_TEAM',
  'LINEUP_CONFIRMED',
  'PREDICTION_SHIFT',
  'AI_INSIGHT_REFRESHED',
  'TRIAL_ENDING',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED'
);

create type player_position as enum ('GK', 'DF', 'MF', 'FW');
create type player_foot as enum ('LEFT', 'RIGHT', 'BOTH', 'UNKNOWN');
```

---

## 4. Schema map (bird's-eye view)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FOOTBALL DOMAIN                              │
│  countries → leagues → seasons                                      │
│  venues                                                             │
│  teams ──────┬──────────┐                                           │
│              │          │                                           │
│              │          └───► player_team_history                   │
│              │                                                      │
│              ▼                                                      │
│  players ────► player_seasons                                       │
│                                                                     │
│  fixtures ──┬─► fixture_events                                      │
│             ├─► fixture_statistics                                  │
│             ├─► lineups ──► lineup_players                          │
│             ├─► player_match_performances                           │
│             └─► form_snapshots  h2h_summaries  standings            │
│                                                                     │
│  predictions ──► model_versions                                     │
│                                                                     │
│  ai_insights                                                        │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│                          USER DOMAIN                                │
│  auth.users (Supabase managed)                                      │
│    └─► profiles                                                     │
│          ├─► user_preferences                                       │
│          ├─► follows                                                │
│          ├─► favorites                                              │
│          ├─► subscriptions ──► entitlements                         │
│          ├─► ai_usage                                               │
│          ├─► notifications                                          │
│          └─► sound_preferences                                      │
│                                                                     │
│  waitlist  (pre-signup)                                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Core football entities

### 5.1 `countries`

```sql
create table public.countries (
  id            uuid primary key default gen_random_uuid(),
  provider_id   text unique,                       -- e.g. api-football country code/id
  code          text unique,                       -- ISO 3166-1 alpha-2 where applicable
  name          text not null,
  flag_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

### 5.2 `leagues`

```sql
create table public.leagues (
  id            uuid primary key default gen_random_uuid(),
  provider_id   integer not null unique,           -- api-football league id
  name          text not null,
  type          text,                              -- "League" | "Cup"
  country_id    uuid references public.countries(id) on delete set null,
  country_name  text,                              -- denormalized for query convenience
  logo_url      text,
  prestige_score numeric(5,2) default 0,           -- used by dashboard featured-match ranking
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index leagues_country_id_idx on public.leagues (country_id);
create index leagues_provider_id_idx on public.leagues (provider_id);
create index leagues_prestige_idx on public.leagues (prestige_score desc);
```

### 5.3 `seasons`

```sql
create table public.seasons (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references public.leagues(id) on delete cascade,
  year          integer not null,                  -- e.g. 2025 for 2025/26
  start_date    date,
  end_date      date,
  is_current    boolean not null default false,
  provider_payload jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (league_id, year)
);

create index seasons_league_id_idx on public.seasons (league_id);
create index seasons_is_current_idx on public.seasons (is_current) where is_current;
```

### 5.4 `venues`

```sql
create table public.venues (
  id            uuid primary key default gen_random_uuid(),
  provider_id   integer unique,
  name          text not null,
  city          text,
  country_id    uuid references public.countries(id) on delete set null,
  capacity      integer,
  surface       text,
  image_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index venues_country_id_idx on public.venues (country_id);
```

### 5.5 `teams`

```sql
create table public.teams (
  id            uuid primary key default gen_random_uuid(),
  provider_id   integer not null unique,
  name          text not null,
  code          text,                              -- short code, e.g. "MUN"
  country_id    uuid references public.countries(id) on delete set null,
  founded       integer,
  is_national   boolean not null default false,
  logo_url      text,
  venue_id      uuid references public.venues(id) on delete set null,
  elo_rating    numeric(6,2) default 1500,         -- current Elo (updated post-match)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index teams_country_id_idx on public.teams (country_id);
create index teams_venue_id_idx on public.teams (venue_id);
create index teams_name_trgm_idx on public.teams using gin (name extensions.gin_trgm_ops);
create index teams_elo_idx on public.teams (elo_rating desc);
```

### 5.6 `players`

```sql
create table public.players (
  id              uuid primary key default gen_random_uuid(),
  provider_id     integer not null unique,
  first_name      text,
  last_name       text,
  full_name       text not null,
  nationality     text,
  country_id      uuid references public.countries(id) on delete set null,
  date_of_birth   date,
  height_cm       integer,
  weight_kg       integer,
  position        player_position,                  -- primary
  secondary_positions player_position[],
  preferred_foot  player_foot default 'UNKNOWN',
  photo_url       text,
  market_value_amount numeric(14,2),
  market_value_currency text,
  market_value_source text,
  market_value_at timestamptz,
  provider_payload jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index players_country_id_idx on public.players (country_id);
create index players_full_name_trgm_idx on public.players using gin (full_name extensions.gin_trgm_ops);
create index players_position_idx on public.players (position);
```

### 5.7 `player_team_history`

Represents current + past team affiliations. Current team = row with `left_on IS NULL`.

```sql
create table public.player_team_history (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.players(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  shirt_number  integer,
  joined_on     date,
  left_on       date,                              -- null = current club
  provider_payload jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index pth_player_id_idx on public.player_team_history (player_id);
create index pth_team_id_idx on public.player_team_history (team_id);
create unique index pth_current_team_idx
  on public.player_team_history (player_id)
  where left_on is null;                            -- one current club per player
```

### 5.8 `player_seasons`

Season-level stats per player, for statistics tab.

```sql
create table public.player_seasons (
  id                uuid primary key default gen_random_uuid(),
  player_id         uuid not null references public.players(id) on delete cascade,
  team_id           uuid references public.teams(id) on delete set null,
  season_id         uuid not null references public.seasons(id) on delete cascade,
  appearances       integer,
  minutes           integer,
  goals             integer,
  assists           integer,
  yellow_cards      integer,
  red_cards         integer,
  average_rating    numeric(4,2),
  provider_payload  jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (player_id, season_id, team_id)
);

create index ps_player_id_idx on public.player_seasons (player_id);
create index ps_season_id_idx on public.player_seasons (season_id);
create index ps_team_id_idx on public.player_seasons (team_id);
```

---

## 6. Fixtures & match state

### 6.1 `fixtures`

```sql
create table public.fixtures (
  id                uuid primary key default gen_random_uuid(),
  provider_id       bigint not null unique,        -- api-football fixture id
  league_id         uuid not null references public.leagues(id) on delete cascade,
  season_id         uuid references public.seasons(id) on delete set null,
  round             text,                          -- "Regular Season - 12"
  home_team_id      uuid not null references public.teams(id) on delete restrict,
  away_team_id      uuid not null references public.teams(id) on delete restrict,
  venue_id          uuid references public.venues(id) on delete set null,
  referee           text,
  kickoff_at        timestamptz not null,
  status            fixture_status not null default 'NS',
  minute            integer,                       -- current live minute
  status_extra_minute integer,                   -- API status.extra (stoppage)
  period_first_start_at timestamptz,             -- API periods.first (unix → timestamptz)
  period_second_start_at timestamptz,            -- API periods.second
  score_home        integer,
  score_away        integer,
  ht_home           integer,
  ht_away           integer,
  ft_home           integer,
  ft_away           integer,
  et_home           integer,
  et_away           integer,
  pen_home          integer,
  pen_away          integer,
  is_live           boolean generated always as (status in ('1H','HT','2H','ET','BT','P','LIVE')) stored,
  active_viewers    integer not null default 0,    -- presence-driven counter (best-effort)
  last_provider_sync_at timestamptz,
  provider_payload  jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create index fixtures_league_id_idx on public.fixtures (league_id);
create index fixtures_season_id_idx on public.fixtures (season_id);
create index fixtures_kickoff_idx on public.fixtures (kickoff_at);
create index fixtures_status_idx on public.fixtures (status);
create index fixtures_is_live_idx on public.fixtures (kickoff_at) where is_live;
create index fixtures_home_team_id_idx on public.fixtures (home_team_id);
create index fixtures_away_team_id_idx on public.fixtures (away_team_id);
create index fixtures_venue_id_idx on public.fixtures (venue_id);

-- Composite for "matches on date X (UTC), ordered by kickoff".
-- `kickoff_at::date` on timestamptz is NOT immutable (depends on session TimeZone),
-- so we pin the cast to UTC via `at time zone 'UTC'`.
create index fixtures_date_kickoff_idx
  on public.fixtures (((kickoff_at at time zone 'UTC')::date), kickoff_at);
```

### 6.2 `fixture_events`

Goals, cards, substitutions, VAR events.

```sql
create table public.fixture_events (
  id            uuid primary key default gen_random_uuid(),
  fixture_id    uuid not null references public.fixtures(id) on delete cascade,
  provider_event_id text,                          -- provider's stable id when available
  minute        integer not null,
  extra_minute  integer,
  team_id       uuid references public.teams(id) on delete set null,
  player_id     uuid references public.players(id) on delete set null,
  assist_player_id uuid references public.players(id) on delete set null,
  type          text not null,                     -- 'Goal' | 'Card' | 'subst' | 'Var' | ...
  detail        text,                              -- 'Normal Goal' | 'Yellow Card' | ...
  comments      text,
  provider_payload jsonb,
  created_at    timestamptz not null default now(),
  unique (fixture_id, provider_event_id)
);

create index fixture_events_fixture_id_idx on public.fixture_events (fixture_id, minute, extra_minute);
create index fixture_events_team_id_idx on public.fixture_events (team_id);
create index fixture_events_player_id_idx on public.fixture_events (player_id);
create index fixture_events_assist_player_id_idx on public.fixture_events (assist_player_id);
create index fixture_events_type_idx on public.fixture_events (type);
```

### 6.3 `fixture_statistics`

Team-level snapshot (one row per fixture per team).

```sql
create table public.fixture_statistics (
  id                uuid primary key default gen_random_uuid(),
  fixture_id        uuid not null references public.fixtures(id) on delete cascade,
  team_id           uuid not null references public.teams(id) on delete cascade,
  shots_total       integer,
  shots_on_target   integer,
  shots_off_target  integer,
  shots_blocked     integer,
  shots_inside_box  integer,
  shots_outside_box integer,
  fouls             integer,
  corners           integer,
  offsides          integer,
  ball_possession   integer,                       -- percent 0–100
  yellow_cards      integer,
  red_cards         integer,
  goalkeeper_saves  integer,
  total_passes      integer,
  passes_accurate   integer,
  passes_percent    integer,
  expected_goals    numeric(5,2),                  -- xG when available
  captured_at       timestamptz not null default now(),
  provider_payload  jsonb,
  updated_at        timestamptz not null default now(),
  unique (fixture_id, team_id)
);

create index fixture_stats_fixture_id_idx on public.fixture_statistics (fixture_id);
create index fixture_stats_team_id_idx on public.fixture_statistics (team_id);
```

### 6.4 `lineups`

```sql
create table public.lineups (
  id            uuid primary key default gen_random_uuid(),
  fixture_id    uuid not null references public.fixtures(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  formation     text,                              -- '4-3-3' etc.
  coach_name    text,
  coach_provider_id integer,
  coach_photo_url text,
  is_confirmed  boolean not null default false,    -- true after official announcement
  provider_payload jsonb,
  captured_at   timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (fixture_id, team_id)
);

create index lineups_fixture_id_idx on public.lineups (fixture_id);
create index lineups_team_id_idx on public.lineups (team_id);
```

### 6.5 `lineup_players`

```sql
create table public.lineup_players (
  id            uuid primary key default gen_random_uuid(),
  lineup_id     uuid not null references public.lineups(id) on delete cascade,
  player_id     uuid references public.players(id) on delete set null,
  shirt_number  integer,
  position      text,                              -- 'G','D','M','F' + provider grid pos
  grid          text,                              -- '4:1' style provider grid
  is_starting   boolean not null default true,
  is_captain    boolean not null default false,
  provider_payload jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index lineup_players_lineup_id_idx on public.lineup_players (lineup_id);
create index lineup_players_player_id_idx on public.lineup_players (player_id);
```

### 6.5b `fixture_sidelined_players`

Injuries and suspensions for a fixture (API-Football `/injuries`).

```sql
create table public.fixture_sidelined_players (
  id                  uuid primary key default gen_random_uuid(),
  fixture_id          uuid not null references public.fixtures(id) on delete cascade,
  team_id             uuid not null references public.teams(id) on delete cascade,
  player_id           uuid references public.players(id) on delete set null,
  player_provider_id  integer,
  player_name         text not null,
  kind                text not null check (kind in ('injury', 'suspension', 'other')),
  reason              text,
  provider_payload    jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (fixture_id, team_id, player_provider_id, kind)
);
```

### 6.6 `player_match_performances`

Player-level contribution per fixture (feeds player profile + AI player impact).

```sql
create table public.player_match_performances (
  id                uuid primary key default gen_random_uuid(),
  fixture_id        uuid not null references public.fixtures(id) on delete cascade,
  player_id         uuid not null references public.players(id) on delete cascade,
  team_id           uuid references public.teams(id) on delete set null,
  minutes           integer,
  rating            numeric(4,2),                  -- e.g. 7.20
  goals             integer default 0,
  assists           integer default 0,
  shots_total       integer default 0,
  shots_on_target   integer default 0,
  passes            integer default 0,
  key_passes        integer default 0,
  yellow_cards      integer default 0,
  red_cards         integer default 0,
  saves             integer default 0,
  was_captain       boolean default false,
  was_starter       boolean default false,
  is_motm           boolean default false,
  provider_payload  jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (fixture_id, player_id)
);

create index pmp_fixture_id_idx on public.player_match_performances (fixture_id);
create index pmp_player_id_idx on public.player_match_performances (player_id);
create index pmp_team_id_idx on public.player_match_performances (team_id);
```

### 6.7 `standings`

One row per team per season, current standing snapshot.

```sql
create table public.standings (
  id                uuid primary key default gen_random_uuid(),
  league_id         uuid not null references public.leagues(id) on delete cascade,
  season_id         uuid not null references public.seasons(id) on delete cascade,
  team_id           uuid not null references public.teams(id) on delete cascade,
  rank              integer,
  group_name        text,                          -- for cup group stages
  played            integer default 0,
  win               integer default 0,
  draw              integer default 0,
  lose              integer default 0,
  goals_for         integer default 0,
  goals_against     integer default 0,
  goal_diff         integer default 0,
  points            integer default 0,
  form              text,                          -- e.g. 'WWDLW'
  home_played       integer,
  home_win          integer,
  home_draw         integer,
  home_lose         integer,
  home_gf           integer,
  home_ga           integer,
  away_played       integer,
  away_win          integer,
  away_draw         integer,
  away_lose         integer,
  away_gf           integer,
  away_ga           integer,
  provider_payload  jsonb,
  captured_at       timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (league_id, season_id, team_id, group_name)
);

create index standings_league_season_idx on public.standings (league_id, season_id, rank);
create index standings_season_id_idx on public.standings (season_id);
create index standings_team_id_idx on public.standings (team_id);
```

---

## 7. Analytics snapshots

Precomputed to keep match page loads instant. Refreshed by cron and post-match hooks.

### 7.1 `form_snapshots`

```sql
create table public.form_snapshots (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  scope         text not null,                     -- 'ALL' | 'HOME' | 'AWAY'
  matches       integer not null,                  -- e.g. 5 or 10
  wins          integer,
  draws         integer,
  losses        integer,
  goals_for     integer,
  goals_against integer,
  clean_sheets  integer,
  failed_to_score integer,
  points        integer,
  ppg           numeric(4,2),
  xg_for        numeric(6,2),
  xg_against    numeric(6,2),
  captured_at   timestamptz not null default now(),
  unique (team_id, scope, matches, captured_at)
);

create index form_snapshots_team_scope_idx on public.form_snapshots (team_id, scope, matches, captured_at desc);
```

### 7.2 `h2h_summaries`

```sql
create table public.h2h_summaries (
  id              uuid primary key default gen_random_uuid(),
  team_a_id       uuid not null references public.teams(id) on delete cascade,
  team_b_id       uuid not null references public.teams(id) on delete cascade,
  scope           text not null,                   -- 'ALL' | 'SAME_COMP'
  league_id       uuid references public.leagues(id) on delete set null,
  window_size     integer not null,                -- e.g. 10 last meetings
  team_a_wins     integer,
  team_b_wins     integer,
  draws           integer,
  team_a_goals    integer,
  team_b_goals    integer,
  captured_at     timestamptz not null default now(),
  check (team_a_id < team_b_id)                    -- canonical ordering (UUID compare)
);

create index h2h_pair_idx on public.h2h_summaries (team_a_id, team_b_id, scope);
create index h2h_summaries_team_b_id_idx on public.h2h_summaries (team_b_id);
create index h2h_summaries_league_id_idx on public.h2h_summaries (league_id);
```

> Because `team_a_id < team_b_id` is enforced, always canonicalize the pair before insert/query.

---

## 8. Predictions

### 8.1 `model_versions`

```sql
create table public.model_versions (
  id            uuid primary key default gen_random_uuid(),
  version       text not null unique,              -- semver, e.g. '1.0.0'
  description   text,
  coefficients  jsonb,                             -- serialized model params
  released_at   timestamptz not null default now(),
  is_active     boolean not null default false     -- one active per type at a time
);

create index model_versions_active_idx on public.model_versions (is_active) where is_active;
```

### 8.2 `predictions`

Every prediction snapshot is stored. Live matches → many rows per fixture.

```sql
create table public.predictions (
  id                uuid primary key default gen_random_uuid(),
  fixture_id        uuid not null references public.fixtures(id) on delete cascade,
  model_version_id  uuid not null references public.model_versions(id) on delete restrict,
  type              prediction_type not null,
  minute            integer,                       -- null for prematch, else live minute
  home_win_prob     numeric(5,4) not null,
  draw_prob         numeric(5,4) not null,
  away_win_prob     numeric(5,4) not null,
  expected_goals_home numeric(5,2),
  expected_goals_away numeric(5,2),
  expected_goals_total_min numeric(5,2),
  expected_goals_total_max numeric(5,2),
  btts_prob         numeric(5,4),
  weaker_team_scoring_prob numeric(5,4),
  confidence        ai_confidence not null,
  input_snapshot    jsonb not null,                -- exact features fed to the model
  created_at        timestamptz not null default now(),
  check (abs(home_win_prob + draw_prob + away_win_prob - 1) < 0.01)
);

create index predictions_fixture_idx on public.predictions (fixture_id, created_at desc);
create index predictions_type_idx on public.predictions (type);
create index predictions_model_version_idx on public.predictions (model_version_id);
create index predictions_prematch_latest_idx
  on public.predictions (fixture_id, created_at desc)
  where type = 'PREMATCH';
```

---

## 9. AI insights & usage

### 9.1 `ai_insights`

Every LLM output is persisted for reproducibility + cache.

```sql
create table public.ai_insights (
  id                uuid primary key default gen_random_uuid(),
  fixture_id        uuid references public.fixtures(id) on delete cascade,
  team_id           uuid references public.teams(id) on delete cascade,      -- for team summaries
  league_id         uuid references public.leagues(id) on delete cascade,    -- for league summaries
  type              ai_insight_type not null,
  prediction_id     uuid references public.predictions(id) on delete set null,
  context_hash      text not null,                 -- hash of trimmed context for cache dedup
  openai_model      text not null,
  prompt_version    text not null,
  summary           text,
  advantage         ai_advantage,
  win_outcome       ai_win_outcome,
  win_probabilities jsonb,                          -- { home, draw, away }
  expected_goals_range int4range,
  weaker_team_scoring_chance numeric(5,4),
  confidence        ai_confidence not null,
  key_factors       jsonb,                          -- array of { label, weight, evidence }
  scenarios         jsonb,                          -- { likely, best, upset }
  commentary        text,
  data_timestamp    timestamptz not null,
  data_quality      ai_data_quality not null,
  raw_output        jsonb not null,                 -- full validated JSON from LLM
  validated         boolean not null default true,
  tokens_input      integer,
  tokens_output     integer,
  cost_usd          numeric(10,6),
  created_at        timestamptz not null default now()
);

create index ai_insights_fixture_idx on public.ai_insights (fixture_id, created_at desc);
create index ai_insights_type_idx on public.ai_insights (type);
create index ai_insights_context_hash_idx on public.ai_insights (context_hash);
create index ai_insights_league_id_idx on public.ai_insights (league_id);
create index ai_insights_team_id_idx on public.ai_insights (team_id);
create index ai_insights_prediction_id_idx on public.ai_insights (prediction_id);
create unique index ai_insights_fixture_type_hash_idx
  on public.ai_insights (fixture_id, type, context_hash)
  where fixture_id is not null;
```

### 9.2 `ai_usage`

Per-user daily counters. UTC day boundary.

```sql
create table public.ai_usage (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  usage_day             date not null,             -- UTC
  ai_predictions_count  integer not null default 0,
  ai_deep_analyses_count integer not null default 0,
  ai_generations_count  integer not null default 0,
  live_ai_matches       uuid[] not null default '{}',   -- distinct fixture_ids consumed live today
  last_live_ai_at       jsonb not null default '{}',    -- { fixture_id: timestamp } for min-interval rule
  updated_at            timestamptz not null default now(),
  unique (user_id, usage_day)
);

create index ai_usage_user_idx on public.ai_usage (user_id, usage_day desc);
```

Redis mirrors the same counters for atomic increments; Postgres is the durable authoritative store (persisted at end of request or nightly reconciliation).

---

## 10. Users, profiles & preferences

Supabase manages `auth.users`. All app-level user data lives in `public.profiles` with a 1:1 relationship keyed by `auth.users.id`.

### 10.1 `profiles`

```sql
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  email             extensions.citext not null,    -- mirrored from auth.users for query convenience
  avatar_url        text,
  timezone          text not null default 'UTC',
  language          text not null default 'en',
  preferred_league_id uuid references public.leagues(id) on delete set null,
  onboarding_completed boolean not null default false,
  is_deleted        boolean not null default false,
  welcome_email_sent_at timestamptz,               -- Resend WelcomeEmail (once)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index profiles_preferred_league_idx on public.profiles (preferred_league_id);
create index profiles_email_idx on public.profiles (email);
```

### 10.2 `user_preferences`

Splits out notification and sound preferences (easier to extend without touching `profiles`).

```sql
create table public.user_preferences (
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
```

---

## 11. Follows, favorites & notifications

### 11.1 `follows`

```sql
create table public.follows (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  object_type   follow_object not null,
  team_id       uuid references public.teams(id) on delete cascade,
  player_id     uuid references public.players(id) on delete cascade,
  league_id     uuid references public.leagues(id) on delete cascade,
  created_at    timestamptz not null default now(),
  check (
    (object_type = 'TEAM'   and team_id  is not null and player_id is null and league_id is null) or
    (object_type = 'PLAYER' and player_id is not null and team_id  is null and league_id is null) or
    (object_type = 'LEAGUE' and league_id is not null and team_id  is null and player_id is null)
  )
);

create unique index follows_user_team_idx    on public.follows (user_id, team_id)   where object_type = 'TEAM';
create unique index follows_user_player_idx  on public.follows (user_id, player_id) where object_type = 'PLAYER';
create unique index follows_user_league_idx  on public.follows (user_id, league_id) where object_type = 'LEAGUE';
create index follows_team_idx   on public.follows (team_id)   where team_id   is not null;
create index follows_player_idx on public.follows (player_id) where player_id is not null;
create index follows_league_idx on public.follows (league_id) where league_id is not null;
```

**FREE cap (migration `0024_follows_free_cap`):** `BEFORE INSERT` trigger `tg_follows_free_cap` uses a per-user advisory lock, reads cap from `platform_limits.free_tier_follows_total` (default **20**, keep in sync with `FREE_TIER_FOLLOWS_TOTAL` env), skips Premium / active subscription, and raises `FOLLOW_LIMIT_REACHED` (`23514`) when a FREE user would exceed the cap.

### 11.2 `favorites`

Matches only (per PRD; team/player/league use `follows`).

```sql
create table public.favorites (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  fixture_id    uuid not null references public.fixtures(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (user_id, fixture_id)
);

create index favorites_user_idx on public.favorites (user_id);
create index favorites_fixture_idx on public.favorites (fixture_id);
```

### 11.3 `notifications`

In-app notification inbox.

```sql
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          notification_kind not null,
  channel       notification_channel not null default 'IN_APP',
  title         text not null,
  body          text,
  fixture_id    uuid references public.fixtures(id) on delete cascade,
  team_id       uuid references public.teams(id)    on delete cascade,
  player_id     uuid references public.players(id)  on delete cascade,
  payload       jsonb,                             -- extra structured payload for UI
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index notifications_fixture_idx on public.notifications (fixture_id) where fixture_id is not null;
create index notifications_team_id_idx on public.notifications (team_id);
create index notifications_player_id_idx on public.notifications (player_id);
```

---

## 12. Subscriptions & entitlements

### 12.1 `subscriptions`

LemonSqueezy is the source of truth; this is our mirrored view.

```sql
create table public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles(id) on delete cascade,
  provider                  text not null default 'lemonsqueezy',
  provider_subscription_id  text not null unique,
  provider_customer_id      text,
  provider_variant_id       text not null,        -- grandfathered price tier
  status                    subscription_status not null,
  price_amount              numeric(8,2) not null, -- e.g. 2.99
  price_currency            text not null default 'EUR',
  trial_ends_at             timestamptz,
  trial_ending_email_sent_at timestamptz,          -- TrialEndingEmail (T-3 days UTC)
  renews_at                 timestamptz,
  cancelled_at              timestamptz,
  ended_at                  timestamptz,
  raw_event_payload         jsonb,                 -- last webhook payload for debugging
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);
create unique index subscriptions_active_user_idx
  on public.subscriptions (user_id)
  where status in ('TRIALING','ACTIVE','PAST_DUE');
```

### 12.2 `entitlements`

Derived from subscription state; read by `entitlementService` on every gated request.

```sql
create table public.entitlements (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  tier              app_tier not null default 'FREE',
  subscription_id   uuid references public.subscriptions(id) on delete set null,
  premium_since     timestamptz,
  premium_until     timestamptz,                   -- expected next renewal or trial-end
  updated_at        timestamptz not null default now()
);

create index entitlements_tier_idx on public.entitlements (tier);
create index entitlements_subscription_id_idx on public.entitlements (subscription_id);
```

Notes:

- Row created for every user via trigger at `profiles` insert.
- Updated by LemonSqueezy webhook handler.

---

## 13. Waitlist

For pre-launch email capture.

```sql
create table public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         extensions.citext not null unique,
  source        text,                              -- 'landing_hero' | 'landing_footer' | ...
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  referrer      text,
  ip_hash       text,                              -- hashed IP for abuse detection
  confirmed_at  timestamptz,
  invited_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index waitlist_created_idx on public.waitlist (created_at desc);
create index waitlist_invited_idx on public.waitlist (invited_at) where invited_at is null;
```

---

## 14. Row Level Security policies

**Rule of thumb:**

- Football/reference tables (leagues, teams, players, fixtures, events, stats, standings, predictions, ai_insights): **public read**, no writes from clients (writes only via service role).
- User-owned tables: **RLS on**, user sees/edits only own rows.
- `waitlist`: **insert-only from anon**, no read from anon.

```sql
-- Enable RLS on every table
alter table public.countries              enable row level security;
alter table public.leagues                enable row level security;
alter table public.seasons                enable row level security;
alter table public.venues                 enable row level security;
alter table public.teams                  enable row level security;
alter table public.players                enable row level security;
alter table public.player_team_history    enable row level security;
alter table public.player_seasons         enable row level security;
alter table public.fixtures               enable row level security;
alter table public.fixture_events         enable row level security;
alter table public.fixture_statistics     enable row level security;
alter table public.lineups                enable row level security;
alter table public.lineup_players         enable row level security;
alter table public.player_match_performances enable row level security;
alter table public.standings              enable row level security;
alter table public.form_snapshots         enable row level security;
alter table public.h2h_summaries          enable row level security;
alter table public.model_versions         enable row level security;
alter table public.predictions            enable row level security;
alter table public.ai_insights            enable row level security;
alter table public.ai_usage               enable row level security;
alter table public.profiles               enable row level security;
alter table public.user_preferences       enable row level security;
alter table public.follows                enable row level security;
alter table public.favorites              enable row level security;
alter table public.notifications          enable row level security;
alter table public.subscriptions          enable row level security;
alter table public.entitlements           enable row level security;
alter table public.waitlist               enable row level security;
```

### 14.1 Reference/football read policies

Repeat this pattern for every reference table. Only `select` for `anon` and `authenticated`; writes are service-role only (RLS blocks anon/authenticated by default when no `insert`/`update`/`delete` policy exists).

```sql
create policy "public read countries"
  on public.countries for select
  to anon, authenticated
  using (true);

-- ... repeat for leagues, seasons, venues, teams, players,
-- player_team_history, player_seasons, fixtures, fixture_events,
-- fixture_statistics, lineups, lineup_players,
-- player_match_performances, standings, form_snapshots,
-- h2h_summaries, model_versions, predictions, ai_insights
```

### 14.2 User-owned policies

```sql
-- profiles
create policy "profiles self select"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles self update"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- user_preferences (identical pattern; key is user_id)
create policy "prefs self select"
  on public.user_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "prefs self upsert"
  on public.user_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "prefs self update"
  on public.user_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- follows
create policy "follows self all"
  on public.follows for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- favorites
create policy "favorites self all"
  on public.favorites for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- notifications
create policy "notifications self select"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications self update"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- notifications: no insert policy for clients — service role only

-- subscriptions
create policy "subscriptions self select"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- subscriptions: no insert/update/delete for clients — service role only (webhook)

-- entitlements
create policy "entitlements self select"
  on public.entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- entitlements: service role writes only

-- ai_usage
create policy "ai_usage self select"
  on public.ai_usage for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ai_usage: service role writes only
```

### 14.3 Waitlist policies

```sql
create policy "waitlist anon insert"
  on public.waitlist for insert
  to anon
  with check (true);

-- No select policy for anon — waitlist reads are service-role only.
```

### 14.4 Storage RLS (avatars bucket)

```sql
-- Bucket created via Supabase Studio or migration.
-- Storage policies (applied to storage.objects):

create policy "avatars self read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "avatars self write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "avatars self update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "avatars self delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
```

---

## 15. Indexes summary

High-impact indexes (already listed under each table). Explicit callouts:

| Query pattern                                     | Index                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| Matches on a given date (UTC), ordered by kickoff | `fixtures_date_kickoff_idx` (UTC-pinned cast)                          |
| Currently live matches                            | `fixtures_is_live_idx` (partial)                                       |
| Latest pre-match prediction per fixture           | `predictions_prematch_latest_idx` (partial, DESC)                      |
| Latest AI insight per fixture per type            | `ai_insights_fixture_idx` + unique `ai_insights_fixture_type_hash_idx` |
| User's follows / favorites                        | `follows_user_*` + `favorites_user_idx`                                |
| League standings                                  | `standings_league_season_idx`                                          |
| Player fuzzy search                               | `players_full_name_trgm_idx` (GIN pg_trgm)                             |
| Team fuzzy search                                 | `teams_name_trgm_idx` (GIN pg_trgm)                                    |
| Unread notifications                              | `notifications_unread_idx` (partial)                                   |
| Current club per player                           | `pth_current_team_idx` (unique partial where `left_on is null`)        |

All foreign key columns are indexed — this is enforced during migration review (Postgres does not create these automatically).

---

## 16. Triggers & functions

### 16.1 `updated_at` auto-refresh

```sql
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Apply to every table that has an updated_at column
create trigger tg_countries_updated_at              before update on public.countries              for each row execute function public.tg_set_updated_at();
create trigger tg_leagues_updated_at                before update on public.leagues                for each row execute function public.tg_set_updated_at();
create trigger tg_seasons_updated_at                before update on public.seasons                for each row execute function public.tg_set_updated_at();
create trigger tg_venues_updated_at                 before update on public.venues                 for each row execute function public.tg_set_updated_at();
create trigger tg_teams_updated_at                  before update on public.teams                  for each row execute function public.tg_set_updated_at();
create trigger tg_players_updated_at                before update on public.players                for each row execute function public.tg_set_updated_at();
create trigger tg_player_team_history_updated_at    before update on public.player_team_history    for each row execute function public.tg_set_updated_at();
create trigger tg_player_seasons_updated_at         before update on public.player_seasons         for each row execute function public.tg_set_updated_at();
create trigger tg_fixtures_updated_at               before update on public.fixtures               for each row execute function public.tg_set_updated_at();
create trigger tg_fixture_statistics_updated_at     before update on public.fixture_statistics     for each row execute function public.tg_set_updated_at();
create trigger tg_lineups_updated_at                before update on public.lineups                for each row execute function public.tg_set_updated_at();
create trigger tg_lineup_players_updated_at         before update on public.lineup_players         for each row execute function public.tg_set_updated_at();
create trigger tg_player_match_perf_updated_at      before update on public.player_match_performances for each row execute function public.tg_set_updated_at();
create trigger tg_standings_updated_at              before update on public.standings              for each row execute function public.tg_set_updated_at();
create trigger tg_profiles_updated_at               before update on public.profiles               for each row execute function public.tg_set_updated_at();
create trigger tg_user_preferences_updated_at       before update on public.user_preferences       for each row execute function public.tg_set_updated_at();
create trigger tg_subscriptions_updated_at          before update on public.subscriptions          for each row execute function public.tg_set_updated_at();
create trigger tg_entitlements_updated_at           before update on public.entitlements           for each row execute function public.tg_set_updated_at();
create trigger tg_ai_usage_updated_at               before update on public.ai_usage               for each row execute function public.tg_set_updated_at();
```

### 16.2 Auto-create `profiles` + `entitlements` + `user_preferences` on signup

Function is created in migration `0007_users.sql`; the trigger on `auth.users` is attached in `0009_billing.sql` (after `entitlements` exists).

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = extensions   -- citext cast; all public.* refs fully qualified
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email::extensions.citext, ''::extensions.citext),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1))
  );

  insert into public.user_preferences (user_id) values (new.id);
  insert into public.entitlements    (user_id, tier) values (new.id, 'FREE');

  return new;
end $$;

-- Attached in 0009_billing.sql:
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 16.3 Lock down `handle_new_user` EXECUTE

`SECURITY DEFINER` functions in `public` are exposed via PostgREST (`/rest/v1/rpc/...`). This function must only run from the auth trigger — revoke client access:

```sql
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.handle_new_user() to postgres;
```

Applied in migration `0016_lockdown_handle_new_user.sql`.

### 16.4 Elo update after full-time (post-MVP polish)

Deferred to Phase 3 — Elo update job runs as a nightly cron reading fixtures that transitioned to `FT` since last run.

### 16.5 Prediction sanity check

Enforced by table `CHECK` (already inline above) — the three win probabilities sum to 1 within 0.01.

### 16.6 Search functions

Materialized as SQL functions (not exposed to clients directly; queried by server via service role or via a `security definer` RPC if we want anon access).

`search_path` is set to `extensions` so pg_trgm's `similarity()` and `%` operator resolve; all `public.*` references are fully qualified.

```sql
create or replace function public.search_teams(q text, max_results integer default 10)
returns table (id uuid, name text, logo_url text, country_name text, sim real)
language sql
stable
security invoker
set search_path = extensions
as $$
  select t.id, t.name, t.logo_url, c.name as country_name, similarity(t.name, q) as sim
  from public.teams t
  left join public.countries c on c.id = t.country_id
  where t.name % q
  order by sim desc, t.elo_rating desc
  limit max_results;
$$;

create or replace function public.search_players(q text, max_results integer default 10)
returns table (id uuid, full_name text, photo_url text, "position" public.player_position, sim real)
language sql
stable
security invoker
set search_path = extensions
as $$
  select p.id, p.full_name, p.photo_url, p.position, similarity(p.full_name, q) as sim
  from public.players p
  where p.full_name % q
  order by sim desc
  limit max_results;
$$;
```

> `teams` has no `country_name` column — country label comes from the joined `countries` row. `"position"` is quoted in the player search return signature because it is a partially-reserved identifier inside `returns table(...)`.

---

## 17. Migration ordering

Split into small, ordered files under `supabase/migrations/`. Suggested numbering:

| #   | Filename                                   | Contents                                                                         |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| 1   | `0001_extensions_and_enums.sql`            | `pgcrypto`, `pg_trgm`, `citext`, `unaccent`, all enums                           |
| 2   | `0002_football_reference.sql`              | countries, leagues, seasons, venues                                              |
| 3   | `0003_teams_players.sql`                   | teams, players, player_team_history, player_seasons                              |
| 4   | `0004_fixtures.sql`                        | fixtures, fixture_events, fixture_statistics, lineups, lineup_players, standings |
| 5   | `0005_analytics.sql`                       | player_match_performances, form_snapshots, h2h_summaries                         |
| 6   | `0006_predictions_and_ai.sql`              | model_versions, predictions, ai_insights, ai_usage                               |
| 7   | `0007_users.sql`                           | profiles, user_preferences, `handle_new_user()` function                         |
| 8   | `0008_follows_favorites_notifications.sql` | follows, favorites, notifications                                                |
| 9   | `0009_billing.sql`                         | subscriptions, entitlements, attach `on_auth_user_created` trigger               |
| 10  | `0010_waitlist.sql`                        | waitlist                                                                         |
| 11  | `0011_updated_at_triggers.sql`             | `tg_set_updated_at()` + attach to all mutable tables                             |
| 12  | `0012_rls_reference.sql`                   | public-read policies for football tables                                         |
| 13  | `0013_rls_user_owned.sql`                  | user-owned policies (profiles/preferences/follows/favorites/notifications/...)   |
| 14  | `0014_storage_avatars.sql`                 | avatars bucket + storage policies                                                |
| 15  | `0015_search_functions.sql`                | `search_teams`, `search_players`                                                 |
| 16  | `0016_lockdown_handle_new_user.sql`        | revoke EXECUTE on `handle_new_user()` from anon/authenticated                    |
| 17  | `0017_missing_fk_indexes.sql`              | covering indexes for FK columns missed in per-table sections                     |

Every migration is idempotent where possible (`create ... if not exists`, `add column if not exists`).

Post-deploy checks (must pass before phase considered done):

- `supabase db reset` completes cleanly against a fresh dev DB.
- MCP `get_advisors` on **`user-supabasei`** (Scorence dev) shows **zero security WARN/ERROR** and **zero performance WARN/ERROR**. Performance INFO `unused_index` on FK indexes from migration 0017 is expected until Phase 2+ queries hit those tables — do not drop those indexes.
- Auto-generated types (`supabase gen types typescript`) compile against the app.
