-- 0016_lockdown_handle_new_user.sql
-- Address Supabase security advisor 0028 / 0029:
-- `public.handle_new_user()` is SECURITY DEFINER and was exposed via PostgREST
-- (`/rest/v1/rpc/handle_new_user`) to the anon and authenticated roles. It is
-- only meant to fire from the `on_auth_user_created` trigger on `auth.users`,
-- so we revoke EXECUTE from every role except `postgres` and `service_role`.

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
-- Grant back to the roles that actually need to run it:
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.handle_new_user() to postgres;
