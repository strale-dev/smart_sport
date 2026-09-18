-- Coach metadata on lineups + fixture sidelined players (injuries/suspensions)

alter table public.lineups
  add column if not exists coach_provider_id integer,
  add column if not exists coach_photo_url text;

create table if not exists public.fixture_sidelined_players (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  player_provider_id integer,
  player_name text not null,
  kind text not null check (kind in ('injury', 'suspension', 'other')),
  reason text,
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fixture_id, team_id, player_provider_id, kind)
);

create index if not exists fixture_sidelined_players_fixture_id_idx
  on public.fixture_sidelined_players (fixture_id);

create index if not exists fixture_sidelined_players_team_id_idx
  on public.fixture_sidelined_players (team_id);

alter table public.fixture_sidelined_players enable row level security;

create trigger tg_fixture_sidelined_players_updated_at
  before update on public.fixture_sidelined_players
  for each row execute function public.tg_set_updated_at();
