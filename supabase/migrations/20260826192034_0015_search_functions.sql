-- 0015_search_functions.sql
-- SECURITY INVOKER helper functions for team/player fuzzy search.
-- Source of truth: docs/DB.md §16.5.
--
-- Notes / deviations from DB.md:
-- * DB.md's search_teams references `t.country_name`, but `teams` only has
--   `country_id`. We join `public.countries` and expose `c.name as country_name`.
-- * `position` is a partially-reserved identifier inside `returns table(...)`,
--   so we quote it in the player search return signature.
-- * pg_trgm's `similarity()` and `%` operator live in the `extensions` schema,
--   so search_path is set to `extensions` (never `public`) and all `public.*`
--   references are fully qualified.

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
