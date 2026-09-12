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

## Meaningful event detection (detector MVP)

After each successful **match** poll tick, `lib/live/eventDetector.ts` compares the previous Redis snapshot to the current provider snapshot:

- **Triggers:** goal (event feed + score-diff fallback), red card (including _Second Yellow card_), penalty (scored penalty goal or VAR penalty signal), team xG delta ≥ **0.5** (only when both snapshots already had xG), significant substitution (starter off before minute **70**), probability swing ≥ **10pp** vs last stored prediction (via live model preview in pipeline).
- **On trigger:** inserts a `LIVE` row in `predictions`, then regenerates shared **`LIVE` `ai_insights`** (Redis cache key `ai:insight:live:{fixtureId}:{contextHash}`). Poller `generateLiveInsight` does **not** consume per-user daily AI quota.

**Redis keys**

| Key                                          | Purpose                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `live:detector:snapshot:{fixtureProviderId}` | Last compared snapshot (TTL 24h)                                   |
| `live:detector:lock:{fixtureProviderId}`     | Short NX lock (~8s) so overlapping poll ticks do not double-detect |

**Known limitation:** VAR overturn does not retract an earlier GOAL trigger; the detector only reacts on the first tick when state appears in the feed or statistics.

When meaningful events fire, structured logs go to the server console (`live/meaningful-event-detector`). Score vs goal-event count mismatches are logged at **warn** before score-diff fallback goals are emitted.

### Broadcast contract (`event: update`)

Existing clients keep working. Optional field on match broadcasts:

```ts
type MeaningfulEventBroadcastPayload = {
  kind:
    | "GOAL"
    | "RED_CARD"
    | "PENALTY"
    | "XG_DELTA"
    | "SIGNIFICANT_SUBSTITUTION"
    | "PROBABILITY_SHIFT";
  minute: number | null;
  teamExternalId: number | null;
  reason: string;
  externalEventId?: string;
  meta?: Record<string, unknown>;
};

type LiveBroadcastPayload = {
  fixtureProviderId?: number;
  syncedAt: string;
  source: "match" | "live-center";
  meaningfulEvents?: MeaningfulEventBroadcastPayload[];
};
```

`meaningfulEvents` is omitted when nothing meaningful occurred on that tick. Treat field names as a stable contract for future AI/live insight work.

**Database:** migration `20260912160000_0021_realtime_live_broadcast_rls.sql` adds RLS on `realtime.messages` so `anon` / `authenticated` can receive broadcasts and track presence on `match:*` and `live:feed`.

- **Apply in Supabase Dashboard → SQL Editor** (postgres owner): [SQL editor](https://supabase.com/dashboard/project/zovobemlpqoclyjhvkpw/sql/new) — paste the migration file. CLI/MCP `db push` / `db query -f` cannot alter `realtime.messages` (`must be owner of table messages`).
- Verify: `npm.cmd run live:verify-rls`

### Broadcast smoke (two tabs)

1. Enable `LIVE_POLLING_ENABLED=true` and Pro API key; apply Realtime RLS migration.
2. Open the same live fixture in two browser tabs — both should register watch via `useLiveMatch`.
3. Trigger `POST /api/internal/live/poll-tick?fixtureProviderId=…` — both tabs should update score/header/timeline without manual refresh.
4. Open `/live` and `/dashboard` — lists should refresh after center or match broadcast (or within 60s fallback).
5. Disable network briefly on Realtime — UI should still refresh on the 60s fallback interval.
