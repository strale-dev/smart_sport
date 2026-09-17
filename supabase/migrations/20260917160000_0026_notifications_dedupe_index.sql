-- 0026_notifications_dedupe_index.sql
-- DB-enforced idempotency for in-app notifications (parallel fan-out safe).

create unique index if not exists notifications_user_dedupe_key_idx
  on public.notifications (user_id, ((payload ->> 'dedupeKey')))
  where payload ? 'dedupeKey'
    and (payload ->> 'dedupeKey') is not null
    and (payload ->> 'dedupeKey') <> '';
