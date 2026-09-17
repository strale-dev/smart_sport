-- Allow authenticated users to receive in-app notification broadcasts on their private topic.

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
    or (
      (select auth.uid()) is not null
      and (select realtime.topic()) = 'user:' || (select auth.uid())::text || ':notifications'
    )
  )
);
