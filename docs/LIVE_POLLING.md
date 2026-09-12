# Live polling API (Phase 5 backend)

Server-side presence-gated polling. Enable with `LIVE_POLLING_ENABLED=true` and API-Football Pro key (`API_FOOTBALL_DAILY_LIMIT=7500`). Live polls bypass `API_FOOTBALL_INGEST_ONLY`.

## Watch / unwatch / heartbeat

### `POST /api/live/watch`

**Match detail**

```json
{ "surface": "match", "fixtureProviderId": 1035037 }
```

**Live Center (bulk `live=all` worker)**

```json
{ "surface": "live-center" }
```

Response:

```json
{
  "ok": true,
  "watchToken": "<uuid>",
  "expiresInSec": 120,
  "worker": { "started": true, "reason": "lock_held" }
}
```

### `POST /api/live/unwatch`

```json
{ "watchToken": "<uuid>" }
```

### `POST /api/live/heartbeat`

```json
{ "watchToken": "<uuid>" }
```

Send heartbeat every ~60s while the tab is visible. Call `unwatch` on unmount (or `navigator.sendBeacon`).

## Manual smoke (Pro key)

```bash
# 1. Watch a live fixture
curl -s -X POST "$SITE/api/live/watch" \
  -H "Content-Type: application/json" \
  -d '{"surface":"match","fixtureProviderId":FIXTURE_ID}'

# 2. Trigger one poll tick (requires CRON_SECRET in production)
curl -s -X POST "$SITE/api/internal/live/poll-tick?fixtureProviderId=FIXTURE_ID" \
  -H "Authorization: Bearer $CRON_SECRET"

# 3. Live Center bulk tick
curl -s -X POST "$SITE/api/live/watch" -H "Content-Type: application/json" \
  -d '{"surface":"live-center"}'
curl -s -X POST "$SITE/api/internal/live/poll-center-tick" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Verify Postgres `fixtures` / `fixture_events` / scores and Redis keys `provider:fixture:{id}`.

## Cron

`GET /api/cron/reap-stale-locks` (every minute) restarts workers when locks expire but viewers remain (after grace rules).

## Realtime broadcast

After each successful poll tick, the server sends Supabase Realtime **Broadcast** (`event: update`):

- `match:{providerId}` — match detail (`useLiveMatch` on `/matches/[id]`)
- `live:feed` — Live Center + dashboard “Live now” (`useLiveFeed` / `useLiveCenterQuery`)

Clients invalidate React Query and refetch:

- `GET /api/matches/[fixtureId]/snapshot`
- `GET /api/live?…`
- `GET /api/dashboard/live`

Fallback while the tab is visible: refetch every **60s** (`LIVE_FALLBACK_REFETCH_MS`) if a broadcast is missed.

**Database:** migration `20260912160000_0021_realtime_live_broadcast_rls.sql` adds RLS on `realtime.messages` so `anon` / `authenticated` can receive broadcasts and track presence on `match:*` and `live:feed`. Apply via Supabase Dashboard SQL (project owner) or `npm.cmd run db:push` if your linked role owns `realtime.messages`.

### Broadcast smoke (two tabs)

1. Enable `LIVE_POLLING_ENABLED=true` and Pro API key; apply Realtime RLS migration.
2. Open the same live fixture in two browser tabs — both should register watch via `useLiveMatch`.
3. Trigger `POST /api/internal/live/poll-tick?fixtureProviderId=…` — both tabs should update score/header/timeline without manual refresh.
4. Open `/live` and `/dashboard` — lists should refresh after center or match broadcast (or within 60s fallback).
5. Disable network briefly on Realtime — UI should still refresh on the 60s fallback interval.
