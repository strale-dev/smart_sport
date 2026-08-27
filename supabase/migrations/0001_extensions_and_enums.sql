-- 0001_extensions_and_enums.sql
-- Kivora / smart_sport — base extensions and enum types.
-- Source of truth: docs/DB.md §2 and §3.

-- Extensions -----------------------------------------------------------------
-- Supabase best practice: install extensions in a dedicated `extensions` schema
-- (never `public`) to avoid namespace pollution and security advisor warnings.
create schema if not exists extensions;

create extension if not exists "pgcrypto"           with schema extensions;
create extension if not exists "pg_trgm"            with schema extensions;
create extension if not exists "citext"             with schema extensions;
create extension if not exists "unaccent"           with schema extensions;
create extension if not exists "pg_stat_statements" with schema extensions;

-- Enums ----------------------------------------------------------------------
-- Enum creation is not natively idempotent; guard each with a DO block.

do $$ begin
  create type public.app_tier as enum ('FREE', 'PREMIUM');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum (
    'TRIALING',
    'ACTIVE',
    'PAST_DUE',
    'CANCELLED',
    'EXPIRED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fixture_status as enum (
    'TBD',
    'NS',
    '1H',
    'HT',
    '2H',
    'ET',
    'BT',
    'P',
    'FT',
    'AET',
    'PEN',
    'SUSP',
    'INT',
    'PST',
    'CANC',
    'ABD',
    'AWD',
    'WO',
    'LIVE'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.prediction_type as enum ('PREMATCH', 'LIVE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_insight_type as enum (
    'PREMATCH',
    'LIVE',
    'DEEP',
    'LEAGUE_SUMMARY',
    'TEAM_SUMMARY'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_confidence as enum ('LOW', 'MEDIUM', 'HIGH');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_data_quality as enum ('COMPLETE', 'PARTIAL', 'STALE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_advantage as enum ('HOME', 'DRAW', 'AWAY', 'EVEN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_win_outcome as enum ('1', 'X', '2');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.follow_object as enum ('TEAM', 'PLAYER', 'LEAGUE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_channel as enum ('IN_APP', 'EMAIL', 'PUSH');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_kind as enum (
    'GOAL_FOR_FOLLOWED_TEAM',
    'FULL_TIME_FOLLOWED_TEAM',
    'LINEUP_CONFIRMED',
    'PREDICTION_SHIFT',
    'AI_INSIGHT_REFRESHED',
    'TRIAL_ENDING',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.player_position as enum ('GK', 'DF', 'MF', 'FW');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.player_foot as enum ('LEFT', 'RIGHT', 'BOTH', 'UNKNOWN');
exception when duplicate_object then null; end $$;
