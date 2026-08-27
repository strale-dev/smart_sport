-- 0014_storage_avatars.sql
-- Avatars bucket + storage.objects policies scoped per user.
-- Source of truth: docs/DB.md §14.4.
-- Users can only read/write files under a top-level folder equal to their auth.uid().

-- Create the bucket (idempotent — Supabase-hosted storage.buckets accepts insert with on conflict do nothing).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policies on storage.objects
drop policy if exists "avatars self read" on storage.objects;
create policy "avatars self read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars self write" on storage.objects;
create policy "avatars self write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars self update" on storage.objects;
create policy "avatars self update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars self delete" on storage.objects;
create policy "avatars self delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
