-- 0011_updated_at_triggers.sql
-- tg_set_updated_at() + BEFORE UPDATE triggers on every mutable table.
-- Source of truth: docs/DB.md §16.1.

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Attach to every table that has an updated_at column.
-- We drop-then-create to keep this migration idempotent.

drop trigger if exists tg_countries_updated_at              on public.countries;
create trigger tg_countries_updated_at              before update on public.countries              for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_leagues_updated_at                on public.leagues;
create trigger tg_leagues_updated_at                before update on public.leagues                for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_seasons_updated_at                on public.seasons;
create trigger tg_seasons_updated_at                before update on public.seasons                for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_venues_updated_at                 on public.venues;
create trigger tg_venues_updated_at                 before update on public.venues                 for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_teams_updated_at                  on public.teams;
create trigger tg_teams_updated_at                  before update on public.teams                  for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_players_updated_at                on public.players;
create trigger tg_players_updated_at                before update on public.players                for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_player_team_history_updated_at    on public.player_team_history;
create trigger tg_player_team_history_updated_at    before update on public.player_team_history    for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_player_seasons_updated_at         on public.player_seasons;
create trigger tg_player_seasons_updated_at         before update on public.player_seasons         for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_fixtures_updated_at               on public.fixtures;
create trigger tg_fixtures_updated_at               before update on public.fixtures               for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_fixture_statistics_updated_at     on public.fixture_statistics;
create trigger tg_fixture_statistics_updated_at     before update on public.fixture_statistics     for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_lineups_updated_at                on public.lineups;
create trigger tg_lineups_updated_at                before update on public.lineups                for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_lineup_players_updated_at         on public.lineup_players;
create trigger tg_lineup_players_updated_at         before update on public.lineup_players         for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_player_match_perf_updated_at      on public.player_match_performances;
create trigger tg_player_match_perf_updated_at      before update on public.player_match_performances for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_standings_updated_at              on public.standings;
create trigger tg_standings_updated_at              before update on public.standings              for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_profiles_updated_at               on public.profiles;
create trigger tg_profiles_updated_at               before update on public.profiles               for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_user_preferences_updated_at       on public.user_preferences;
create trigger tg_user_preferences_updated_at       before update on public.user_preferences       for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_subscriptions_updated_at          on public.subscriptions;
create trigger tg_subscriptions_updated_at          before update on public.subscriptions          for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_entitlements_updated_at           on public.entitlements;
create trigger tg_entitlements_updated_at           before update on public.entitlements           for each row execute function public.tg_set_updated_at();

drop trigger if exists tg_ai_usage_updated_at               on public.ai_usage;
create trigger tg_ai_usage_updated_at               before update on public.ai_usage               for each row execute function public.tg_set_updated_at();
