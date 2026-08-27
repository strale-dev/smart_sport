-- 0010_waitlist.sql
-- Waitlist (pre-signup email capture).
-- Source of truth: docs/DB.md §13.

create table if not exists public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        extensions.citext not null unique,
  source       text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  referrer     text,
  ip_hash      text,
  confirmed_at timestamptz,
  invited_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists waitlist_created_idx on public.waitlist (created_at desc);
create index if not exists waitlist_invited_idx on public.waitlist (invited_at) where invited_at is null;
