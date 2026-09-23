-- 0032_global_search.sql
-- Extended global search RPCs for teams, players, leagues, and fixtures.

drop function if exists public.search_teams(text, integer);
drop function if exists public.search_players(text, integer);
drop function if exists public.search_leagues(text, integer);
drop function if exists public.search_fixtures(text, integer, timestamptz, timestamptz);

create index if not exists leagues_name_trgm_idx
  on public.leagues using gin (name extensions.gin_trgm_ops);

create or replace function public.search_teams(q text, max_results integer default 40)
returns table (
  id uuid,
  provider_id integer,
  name text,
  code text,
  logo_url text,
  country_name text,
  elo_rating numeric,
  sim real
)
language sql
stable
security invoker
set search_path = extensions
as $$
  with norm as (
    select extensions.unaccent(lower(trim(q))) as needle
  )
  select
    t.id,
    t.provider_id,
    t.name,
    t.code,
    t.logo_url,
    c.name as country_name,
    t.elo_rating,
    greatest(
      similarity(t.name, q),
      similarity(coalesce(t.code, ''), q),
      similarity(extensions.unaccent(lower(t.name)), (select needle from norm))
    ) as sim
  from public.teams t
  left join public.countries c on c.id = t.country_id
  cross join norm
  where
    t.name % q
    or coalesce(t.code, '') % q
    or extensions.unaccent(lower(t.name)) % (select needle from norm)
  order by sim desc, t.elo_rating desc nulls last
  limit max_results;
$$;

create or replace function public.search_players(q text, max_results integer default 40)
returns table (
  id uuid,
  provider_id integer,
  full_name text,
  first_name text,
  last_name text,
  photo_url text,
  "position" public.player_position,
  team_provider_id integer,
  team_name text,
  team_logo_url text,
  sim real
)
language sql
stable
security invoker
set search_path = extensions
as $$
  with norm as (
    select extensions.unaccent(lower(trim(q))) as needle
  )
  select
    p.id,
    p.provider_id,
    p.full_name,
    p.first_name,
    p.last_name,
    p.photo_url,
    p.position,
    cur.team_provider_id,
    cur.team_name,
    cur.team_logo_url,
    greatest(
      similarity(p.full_name, q),
      similarity(coalesce(p.first_name, ''), q),
      similarity(coalesce(p.last_name, ''), q),
      similarity(extensions.unaccent(lower(p.full_name)), (select needle from norm))
    ) as sim
  from public.players p
  cross join norm
  left join lateral (
    select
      t.provider_id as team_provider_id,
      t.name as team_name,
      t.logo_url as team_logo_url
    from public.player_team_history pth
    join public.teams t on t.id = pth.team_id
    where pth.player_id = p.id and pth.left_on is null
    limit 1
  ) cur on true
  where
    p.full_name % q
    or coalesce(p.first_name, '') % q
    or coalesce(p.last_name, '') % q
    or extensions.unaccent(lower(p.full_name)) % (select needle from norm)
  order by sim desc
  limit max_results;
$$;

create or replace function public.search_leagues(q text, max_results integer default 40)
returns table (
  id uuid,
  provider_id integer,
  name text,
  logo_url text,
  country_name text,
  prestige_score numeric,
  sim real
)
language sql
stable
security invoker
set search_path = extensions
as $$
  with norm as (
    select extensions.unaccent(lower(trim(q))) as needle
  )
  select
    l.id,
    l.provider_id,
    l.name,
    l.logo_url,
    l.country_name,
    l.prestige_score,
    greatest(
      similarity(l.name, q),
      similarity(coalesce(l.country_name, ''), q),
      similarity(extensions.unaccent(lower(l.name)), (select needle from norm))
    ) as sim
  from public.leagues l
  cross join norm
  where
    l.is_active
    and (
      l.name % q
      or coalesce(l.country_name, '') % q
      or extensions.unaccent(lower(l.name)) % (select needle from norm)
    )
  order by sim desc, l.prestige_score desc nulls last
  limit max_results;
$$;

create or replace function public.search_fixtures(
  q text,
  max_results integer default 40,
  from_at timestamptz default (now() - interval '7 days'),
  to_at timestamptz default (now() + interval '14 days')
)
returns table (
  provider_id bigint,
  kickoff_at timestamptz,
  status public.fixture_status,
  score_home integer,
  score_away integer,
  home_provider_id integer,
  home_name text,
  home_logo_url text,
  away_provider_id integer,
  away_name text,
  away_logo_url text,
  league_provider_id integer,
  league_name text,
  league_logo_url text,
  sim real
)
language sql
stable
security invoker
set search_path = extensions
as $$
  select
    f.provider_id,
    f.kickoff_at,
    f.status,
    f.score_home,
    f.score_away,
    ht.provider_id as home_provider_id,
    ht.name as home_name,
    ht.logo_url as home_logo_url,
    at.provider_id as away_provider_id,
    at.name as away_name,
    at.logo_url as away_logo_url,
    lg.provider_id as league_provider_id,
    lg.name as league_name,
    lg.logo_url as league_logo_url,
    greatest(
      similarity(ht.name, q),
      similarity(at.name, q),
      similarity(lg.name, q),
      similarity(ht.name || ' ' || at.name, q)
    ) as sim
  from public.fixtures f
  join public.teams ht on ht.id = f.home_team_id
  join public.teams at on at.id = f.away_team_id
  join public.leagues lg on lg.id = f.league_id
  where
    f.kickoff_at >= from_at
    and f.kickoff_at < to_at
    and (
      ht.name % q
      or at.name % q
      or lg.name % q
      or (ht.name || ' ' || at.name) % q
    )
  order by
    case
      when f.status in ('1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE') then 0
      else 1
    end,
    sim desc,
    abs(extract(epoch from (f.kickoff_at - now()))) asc
  limit max_results;
$$;
