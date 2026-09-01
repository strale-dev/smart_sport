-- 0018_handle_new_user_metadata.sql
-- Persist display name + optional marketing opt-in from signup metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = extensions
as $$
declare
  v_display_name text;
  v_marketing boolean;
begin
  v_display_name := nullif(trim(
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name'
    )
  ), '');

  v_marketing := coalesce((new.raw_user_meta_data->>'email_marketing_optin')::boolean, false);

  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email::extensions.citext, ''::extensions.citext),
    coalesce(v_display_name, split_part(coalesce(new.email, ''), '@', 1))
  );

  insert into public.user_preferences (user_id, email_marketing_optin)
  values (new.id, v_marketing);

  insert into public.entitlements (user_id, tier) values (new.id, 'FREE');

  return new;
end $$;
