-- 0008_follows_favorites_notifications.sql
-- follows, favorites, notifications.
-- Source of truth: docs/DB.md §11.1, §11.2, §11.3.

create table if not exists public.follows (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  object_type public.follow_object not null,
  team_id     uuid references public.teams(id)   on delete cascade,
  player_id   uuid references public.players(id) on delete cascade,
  league_id   uuid references public.leagues(id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (
    (object_type = 'TEAM'   and team_id   is not null and player_id is null and league_id is null) or
    (object_type = 'PLAYER' and player_id is not null and team_id   is null and league_id is null) or
    (object_type = 'LEAGUE' and league_id is not null and team_id   is null and player_id is null)
  )
);

create unique index if not exists follows_user_team_idx   on public.follows (user_id, team_id)   where object_type = 'TEAM';
create unique index if not exists follows_user_player_idx on public.follows (user_id, player_id) where object_type = 'PLAYER';
create unique index if not exists follows_user_league_idx on public.follows (user_id, league_id) where object_type = 'LEAGUE';
create index if not exists follows_team_idx   on public.follows (team_id)   where team_id   is not null;
create index if not exists follows_player_idx on public.follows (player_id) where player_id is not null;
create index if not exists follows_league_idx on public.follows (league_id) where league_id is not null;

create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, fixture_id)
);

create index if not exists favorites_user_idx    on public.favorites (user_id);
create index if not exists favorites_fixture_idx on public.favorites (fixture_id);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       public.notification_kind not null,
  channel    public.notification_channel not null default 'IN_APP',
  title      text not null,
  body       text,
  fixture_id uuid references public.fixtures(id) on delete cascade,
  team_id    uuid references public.teams(id)    on delete cascade,
  player_id  uuid references public.players(id)  on delete cascade,
  payload    jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx    on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx  on public.notifications (user_id, created_at desc) where read_at is null;
create index if not exists notifications_fixture_idx on public.notifications (fixture_id) where fixture_id is not null;
