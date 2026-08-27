-- 0009_billing.sql
-- subscriptions, entitlements, and attach the auth trigger (handle_new_user).
-- Source of truth: docs/DB.md §12.1, §12.2, §16.2.

create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles(id) on delete cascade,
  provider                  text not null default 'lemonsqueezy',
  provider_subscription_id  text not null unique,
  provider_customer_id      text,
  provider_variant_id       text not null,
  status                    public.subscription_status not null,
  price_amount              numeric(8,2) not null,
  price_currency            text not null default 'EUR',
  trial_ends_at             timestamptz,
  renews_at                 timestamptz,
  cancelled_at              timestamptz,
  ended_at                  timestamptz,
  raw_event_payload         jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists subscriptions_user_idx   on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create unique index if not exists subscriptions_active_user_idx
  on public.subscriptions (user_id)
  where status in ('TRIALING','ACTIVE','PAST_DUE');

create table if not exists public.entitlements (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  tier            public.app_tier not null default 'FREE',
  subscription_id uuid references public.subscriptions(id) on delete set null,
  premium_since   timestamptz,
  premium_until   timestamptz,
  updated_at      timestamptz not null default now()
);

create index if not exists entitlements_tier_idx on public.entitlements (tier);

-- Attach handle_new_user trigger now that all tables it touches exist.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
