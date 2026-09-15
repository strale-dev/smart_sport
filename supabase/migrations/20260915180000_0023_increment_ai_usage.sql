-- Atomic ai_usage increments (service role via admin client).

create or replace function public.increment_ai_usage(
  p_user_id uuid,
  p_usage_day date,
  p_predictions integer default 0,
  p_deep_analyses integer default 0,
  p_generations integer default 0,
  p_live_fixture_uuid uuid default null,
  p_live_touch_at timestamptz default null
)
returns public.ai_usage
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.ai_usage;
  v_matches uuid[];
  v_last jsonb;
  v_ts text;
begin
  insert into public.ai_usage (
    user_id,
    usage_day,
    ai_predictions_count,
    ai_deep_analyses_count,
    ai_generations_count,
    live_ai_matches,
    last_live_ai_at
  )
  values (
    p_user_id,
    p_usage_day,
    greatest(p_predictions, 0),
    greatest(p_deep_analyses, 0),
    greatest(p_generations, 0),
    case
      when p_live_fixture_uuid is null then '{}'::uuid[]
      else array[p_live_fixture_uuid]
    end,
    case
      when p_live_fixture_uuid is null or p_live_touch_at is null then '{}'::jsonb
      else jsonb_build_object(p_live_fixture_uuid::text, to_jsonb(p_live_touch_at))
    end
  )
  on conflict (user_id, usage_day) do update
  set
    ai_predictions_count = public.ai_usage.ai_predictions_count + greatest(p_predictions, 0),
    ai_deep_analyses_count = public.ai_usage.ai_deep_analyses_count + greatest(p_deep_analyses, 0),
    ai_generations_count = public.ai_usage.ai_generations_count + greatest(p_generations, 0),
    live_ai_matches = (
      select coalesce(array_agg(distinct m), '{}'::uuid[])
      from (
        select unnest(public.ai_usage.live_ai_matches) as m
        union
        select p_live_fixture_uuid where p_live_fixture_uuid is not null
      ) s
    ),
    last_live_ai_at = case
      when p_live_fixture_uuid is null or p_live_touch_at is null then public.ai_usage.last_live_ai_at
      else public.ai_usage.last_live_ai_at
        || jsonb_build_object(p_live_fixture_uuid::text, to_jsonb(p_live_touch_at))
    end,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.increment_ai_usage(
  uuid, date, integer, integer, integer, uuid, timestamptz
) from public;
revoke all on function public.increment_ai_usage(
  uuid, date, integer, integer, integer, uuid, timestamptz
) from anon, authenticated;

create or replace function public.merge_ai_usage_from_redis(
  p_user_id uuid,
  p_usage_day date,
  p_predictions integer,
  p_deep_analyses integer,
  p_generations integer,
  p_live_ai_matches uuid[],
  p_last_live_ai_at jsonb
)
returns public.ai_usage
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.ai_usage;
  v_matches uuid[];
  v_last jsonb;
begin
  insert into public.ai_usage (
    user_id,
    usage_day,
    ai_predictions_count,
    ai_deep_analyses_count,
    ai_generations_count,
    live_ai_matches,
    last_live_ai_at
  )
  values (
    p_user_id,
    p_usage_day,
    greatest(p_predictions, 0),
    greatest(p_deep_analyses, 0),
    greatest(p_generations, 0),
    coalesce(p_live_ai_matches, '{}'::uuid[]),
    coalesce(p_last_live_ai_at, '{}'::jsonb)
  )
  on conflict (user_id, usage_day) do update
  set
    ai_predictions_count = greatest(
      public.ai_usage.ai_predictions_count,
      excluded.ai_predictions_count
    ),
    ai_deep_analyses_count = greatest(
      public.ai_usage.ai_deep_analyses_count,
      excluded.ai_deep_analyses_count
    ),
    ai_generations_count = greatest(
      public.ai_usage.ai_generations_count,
      excluded.ai_generations_count
    ),
    live_ai_matches = (
      select coalesce(array_agg(distinct m), '{}'::uuid[])
      from (
        select unnest(public.ai_usage.live_ai_matches) as m
        union
        select unnest(excluded.live_ai_matches) as m
      ) s
    ),
    last_live_ai_at = (
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
      from (
        select key, value
        from jsonb_each(public.ai_usage.last_live_ai_at)
        union all
        select key, value
        from jsonb_each(excluded.last_live_ai_at)
      ) merged
    ),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.merge_ai_usage_from_redis(
  uuid, date, integer, integer, integer, uuid[], jsonb
) from public;
revoke all on function public.merge_ai_usage_from_redis(
  uuid, date, integer, integer, integer, uuid[], jsonb
) from anon, authenticated;
