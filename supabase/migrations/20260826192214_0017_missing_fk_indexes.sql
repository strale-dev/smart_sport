-- 0017_missing_fk_indexes.sql
-- Address performance advisor 0001 (unindexed foreign keys).
-- DB.md §15 requires every FK column to have a covering index; ten FKs slipped
-- through the original migrations. This migration closes that gap.

-- ai_insights
create index if not exists ai_insights_league_id_idx     on public.ai_insights (league_id);
create index if not exists ai_insights_team_id_idx       on public.ai_insights (team_id);
create index if not exists ai_insights_prediction_id_idx on public.ai_insights (prediction_id);

-- entitlements
create index if not exists entitlements_subscription_id_idx on public.entitlements (subscription_id);

-- fixture_events
create index if not exists fixture_events_assist_player_id_idx on public.fixture_events (assist_player_id);

-- h2h_summaries
-- h2h_pair_idx already covers (team_a_id, team_b_id, scope), but a lookup by
-- team_b_id alone (e.g. "all opponents' summaries against team B") needs its own.
create index if not exists h2h_summaries_team_b_id_idx on public.h2h_summaries (team_b_id);
create index if not exists h2h_summaries_league_id_idx on public.h2h_summaries (league_id);

-- notifications
create index if not exists notifications_team_id_idx   on public.notifications (team_id);
create index if not exists notifications_player_id_idx on public.notifications (player_id);

-- standings
-- standings_league_season_idx leads on league_id; a lookup by season_id alone
-- (e.g. all leagues in a given season) needs its own index.
create index if not exists standings_season_id_idx on public.standings (season_id);
