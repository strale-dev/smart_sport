-- RC-3: At most one is_current season per league (repair historical fixture-ingest drift).

update public.seasons
set is_current = false
where is_current = true;

update public.seasons s
set is_current = true
from (
  select league_id, max(year) as max_year
  from public.seasons
  group by league_id
) canonical
where s.league_id = canonical.league_id
  and s.year = canonical.max_year;

create unique index if not exists seasons_one_current_per_league_idx
  on public.seasons (league_id)
  where is_current = true;
