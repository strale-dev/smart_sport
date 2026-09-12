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
