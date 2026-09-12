-- Allow guest + signed-in clients to receive live match / feed broadcasts and track presence.
-- Server sends broadcasts via service role REST API (public topics).

alter table realtime.messages enable row level security;

drop policy if exists "live_topics_receive_broadcast" on realtime.messages;
create policy "live_topics_receive_broadcast"
on realtime.messages
for select
to anon, authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and (
    (select realtime.topic()) = 'live:feed'
    or (select realtime.topic()) like 'match:%'
  )
);

drop policy if exists "live_topics_track_presence" on realtime.messages;
create policy "live_topics_track_presence"
on realtime.messages
for insert
to anon, authenticated
with check (
  realtime.messages.extension in ('presence')
  and (
    (select realtime.topic()) = 'live:feed'
    or (select realtime.topic()) like 'match:%'
  )
);
