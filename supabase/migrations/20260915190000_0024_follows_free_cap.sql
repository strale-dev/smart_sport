-- 0024_follows_free_cap.sql
-- Atomic FREE-tier follow cap (advisory lock + count in BEFORE INSERT trigger).
-- Keep platform_limits.free_tier_follows_total default in sync with FREE_TIER_FOLLOWS_TOTAL env default (20).

create table if not exists public.platform_limits (
  id                        int primary key default 1 check (id = 1),
  free_tier_follows_total   int not null default 20 check (free_tier_follows_total > 0)
);

insert into public.platform_limits (id, free_tier_follows_total)
values (1, 20)
on conflict (id) do nothing;

alter table public.platform_limits enable row level security;

create policy "platform_limits read authenticated"
  on public.platform_limits for select
  to authenticated
  using (true);

create or replace function public.tg_follows_enforce_free_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap int;
  v_count int;
  v_tier public.app_tier;
  v_sub_status public.subscription_status;
begin
  perform pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 7423910));

  select coalesce(pl.free_tier_follows_total, 20)
    into v_cap
  from public.platform_limits pl
  where pl.id = 1;

  select e.tier, s.status
    into v_tier, v_sub_status
  from public.entitlements e
  left join public.subscriptions s on s.id = e.subscription_id
  where e.user_id = NEW.user_id;

  if v_tier = 'PREMIUM'
     or v_sub_status in ('TRIALING', 'ACTIVE', 'PAST_DUE') then
    return NEW;
  end if;

  select count(*)::int
    into v_count
  from public.follows f
  where f.user_id = NEW.user_id;

  if v_count >= v_cap then
    raise exception 'FOLLOW_LIMIT_REACHED'
      using
        errcode = '23514',
        constraint = 'follows_free_tier_cap';
  end if;

  return NEW;
end;
$$;

drop trigger if exists tg_follows_free_cap on public.follows;
create trigger tg_follows_free_cap
  before insert on public.follows
  for each row
  execute function public.tg_follows_enforce_free_cap();
