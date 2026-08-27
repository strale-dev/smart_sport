-- 0012_rls_reference.sql
-- Enable RLS on every table and add PUBLIC READ policies for the football
-- reference/analytics tables. Writes are service-role only (no policy = deny).
-- Source of truth: docs/DB.md §14 and §14.1.

-- Enable RLS on every table (user tables covered here too; their policies live in 0013).
alter table public.countries                  enable row level security;
alter table public.leagues                    enable row level security;
alter table public.seasons                    enable row level security;
alter table public.venues                     enable row level security;
alter table public.teams                      enable row level security;
alter table public.players                    enable row level security;
alter table public.player_team_history        enable row level security;
alter table public.player_seasons             enable row level security;
alter table public.fixtures                   enable row level security;
alter table public.fixture_events             enable row level security;
alter table public.fixture_statistics         enable row level security;
alter table public.lineups                    enable row level security;
alter table public.lineup_players             enable row level security;
alter table public.player_match_performances  enable row level security;
alter table public.standings                  enable row level security;
alter table public.form_snapshots             enable row level security;
alter table public.h2h_summaries              enable row level security;
alter table public.model_versions             enable row level security;
alter table public.predictions                enable row level security;
alter table public.ai_insights                enable row level security;
alter table public.ai_usage                   enable row level security;
alter table public.profiles                   enable row level security;
alter table public.user_preferences           enable row level security;
alter table public.follows                    enable row level security;
alter table public.favorites                  enable row level security;
alter table public.notifications              enable row level security;
alter table public.subscriptions              enable row level security;
alter table public.entitlements               enable row level security;
alter table public.waitlist                   enable row level security;

-- Helper: safe policy (drop then create) so this migration is idempotent.
-- We inline the drop-then-create pattern for each policy below.

-- Public read policies on football/reference/analytics data ----------------
drop policy if exists "public read countries" on public.countries;
create policy "public read countries"
  on public.countries for select
  to anon, authenticated
  using (true);

drop policy if exists "public read leagues" on public.leagues;
create policy "public read leagues"
  on public.leagues for select
  to anon, authenticated
  using (true);

drop policy if exists "public read seasons" on public.seasons;
create policy "public read seasons"
  on public.seasons for select
  to anon, authenticated
  using (true);

drop policy if exists "public read venues" on public.venues;
create policy "public read venues"
  on public.venues for select
  to anon, authenticated
  using (true);

drop policy if exists "public read teams" on public.teams;
create policy "public read teams"
  on public.teams for select
  to anon, authenticated
  using (true);

drop policy if exists "public read players" on public.players;
create policy "public read players"
  on public.players for select
  to anon, authenticated
  using (true);

drop policy if exists "public read player_team_history" on public.player_team_history;
create policy "public read player_team_history"
  on public.player_team_history for select
  to anon, authenticated
  using (true);

drop policy if exists "public read player_seasons" on public.player_seasons;
create policy "public read player_seasons"
  on public.player_seasons for select
  to anon, authenticated
  using (true);

drop policy if exists "public read fixtures" on public.fixtures;
create policy "public read fixtures"
  on public.fixtures for select
  to anon, authenticated
  using (true);

drop policy if exists "public read fixture_events" on public.fixture_events;
create policy "public read fixture_events"
  on public.fixture_events for select
  to anon, authenticated
  using (true);

drop policy if exists "public read fixture_statistics" on public.fixture_statistics;
create policy "public read fixture_statistics"
  on public.fixture_statistics for select
  to anon, authenticated
  using (true);

drop policy if exists "public read lineups" on public.lineups;
create policy "public read lineups"
  on public.lineups for select
  to anon, authenticated
  using (true);

drop policy if exists "public read lineup_players" on public.lineup_players;
create policy "public read lineup_players"
  on public.lineup_players for select
  to anon, authenticated
  using (true);

drop policy if exists "public read player_match_performances" on public.player_match_performances;
create policy "public read player_match_performances"
  on public.player_match_performances for select
  to anon, authenticated
  using (true);

drop policy if exists "public read standings" on public.standings;
create policy "public read standings"
  on public.standings for select
  to anon, authenticated
  using (true);

drop policy if exists "public read form_snapshots" on public.form_snapshots;
create policy "public read form_snapshots"
  on public.form_snapshots for select
  to anon, authenticated
  using (true);

drop policy if exists "public read h2h_summaries" on public.h2h_summaries;
create policy "public read h2h_summaries"
  on public.h2h_summaries for select
  to anon, authenticated
  using (true);

drop policy if exists "public read model_versions" on public.model_versions;
create policy "public read model_versions"
  on public.model_versions for select
  to anon, authenticated
  using (true);

drop policy if exists "public read predictions" on public.predictions;
create policy "public read predictions"
  on public.predictions for select
  to anon, authenticated
  using (true);

drop policy if exists "public read ai_insights" on public.ai_insights;
create policy "public read ai_insights"
  on public.ai_insights for select
  to anon, authenticated
  using (true);
