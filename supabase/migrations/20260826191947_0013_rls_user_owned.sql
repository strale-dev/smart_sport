-- 0013_rls_user_owned.sql
-- Row-level security policies for user-owned tables + waitlist.
-- Source of truth: docs/DB.md §14.2, §14.3.

-- profiles ----------------------------------------------------------------
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- user_preferences --------------------------------------------------------
drop policy if exists "prefs self select" on public.user_preferences;
create policy "prefs self select"
  on public.user_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "prefs self upsert" on public.user_preferences;
create policy "prefs self upsert"
  on public.user_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "prefs self update" on public.user_preferences;
create policy "prefs self update"
  on public.user_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- follows -----------------------------------------------------------------
drop policy if exists "follows self all" on public.follows;
create policy "follows self all"
  on public.follows for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- favorites ---------------------------------------------------------------
drop policy if exists "favorites self all" on public.favorites;
create policy "favorites self all"
  on public.favorites for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- notifications -----------------------------------------------------------
drop policy if exists "notifications self select" on public.notifications;
create policy "notifications self select"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notifications self update" on public.notifications;
create policy "notifications self update"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- subscriptions -----------------------------------------------------------
drop policy if exists "subscriptions self select" on public.subscriptions;
create policy "subscriptions self select"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- entitlements ------------------------------------------------------------
drop policy if exists "entitlements self select" on public.entitlements;
create policy "entitlements self select"
  on public.entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ai_usage ----------------------------------------------------------------
drop policy if exists "ai_usage self select" on public.ai_usage;
create policy "ai_usage self select"
  on public.ai_usage for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- waitlist ----------------------------------------------------------------
drop policy if exists "waitlist anon insert" on public.waitlist;
create policy "waitlist anon insert"
  on public.waitlist for insert
  to anon
  with check (true);
-- No SELECT policy for anon — service role only.
