-- 0041_fixture_league_presence.sql
-- Aggregate league tabs for fixtures discovery without scanning full fixture rows.

create or replace function public.fixture_league_presence_in_range(
  kickoff_from timestamptz,
  kickoff_to_exclusive timestamptz,
  league_provider_ids bigint[] default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with scoped as (
    select distinct
      l.provider_id,
      f.is_live
    from public.fixtures f
    inner join public.leagues l on l.id = f.league_id
    where f.kickoff_at >= kickoff_from
      and f.kickoff_at < kickoff_to_exclusive
      and (
        league_provider_ids is null
        or l.provider_id = any (league_provider_ids)
      )
  )
  select jsonb_build_object(
    'active_league_provider_ids',
    coalesce(
      (
        select jsonb_agg(provider_id order by provider_id)
        from (select distinct provider_id from scoped) s
      ),
      '[]'::jsonb
    ),
    'live_league_provider_ids',
    coalesce(
      (
        select jsonb_agg(provider_id order by provider_id)
        from (select distinct provider_id from scoped where is_live) s
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.fixture_league_presence_in_range(
  timestamptz,
  timestamptz,
  bigint[]
) from public;

grant execute on function public.fixture_league_presence_in_range(
  timestamptz,
  timestamptz,
  bigint[]
) to service_role;
