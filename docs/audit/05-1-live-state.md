# Audit 05-1 — Live ingestion and live state

**Date:** 2026-10-11  
**Prerequisites:** [01-1-ingestion-client.md](./01-1-ingestion-client.md), [01-2-fixture-ingestion.md](./01-2-fixture-ingestion.md), [03-2-readiness-model.md](./03-2-readiness-model.md), [04-1-prematch-prediction.md](./04-1-prematch-prediction.md)

---

## 1. Current live architecture

### Authoritative sources

| Layer                 | Source                     | Storage / cache                                                                                              |
| --------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Score, minute, status | API-Football fixture by id | Postgres `fixtures` + Redis `providerFixtureKey` via [ingest-live-tick.ts](../lib/live/ingest-live-tick.ts)  |
| Events                | API-Football events        | `fixture_events` + Redis events key                                                                          |
| Statistics            | API-Football statistics    | `fixture_statistics` + Redis stats key                                                                       |
| Live predictions      | In-house model             | `predictions.type = LIVE`                                                                                    |
| Client snapshot       | Postgres read + Realtime   | [useLiveMatch](../hooks/useLiveMatch.ts), [snapshot route](../app/api/matches/[fixtureId]/snapshot/route.ts) |

### Update paths

1. **Presence polling** — `POST /api/live/watch` → [poller.ts](../lib/live/poller.ts) → internal `poll-tick` → [fixture-live-ingest-pipeline.ts](../lib/live/fixture-live-ingest-pipeline.ts).
2. **Bulk** — GHA `*/15` → `/api/cron/sync-live-center` → [ingest-live-center-tick.ts](../lib/live/ingest-live-center-tick.ts) + [reconcile-stale-live.ts](../lib/live/reconcile-stale-live.ts).
3. **Intraday fixture refresh** — `sync-fixtures-today` can refresh statuses when ingest-only (merged live list in [footballService.ts](../lib/services/footballService.ts)).
4. **Stale recovery** — reconcile + [finalize-expired-stale-live.ts](../lib/live/finalize-expired-stale-live.ts); presentation guard [live-presentation.ts](../lib/live/live-presentation.ts) (`LIVE_STALE_PROVIDER_SYNC_MS` = 8 min).

All provider writes gated by `LIVE_POLLING_ENABLED` ([lib/env.ts](../lib/env.ts), default **false** if unset).

---

## 2. Audit findings (root causes)

| ID    | Issue                                                                                                                         | Impact                                                                        |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| LS-01 | `LIVE_POLLING_ENABLED` off → crons HTTP 200 `skipped`, watch fails closed, but readiness did not mark live as **unavailable** | Operators/users could infer “live” from status alone while data never updates |
| LS-02 | Statistics provider failure aborted entire live tick                                                                          | Score/events not persisted when only stats failed                             |
| LS-03 | `live_sync` readiness item used `not_yet_available` for fresh sync (opaque)                                                   | Harder to distinguish healthy sync vs missing item semantics                  |
| LS-04 | No structured log when live fixture sync age exceeds threshold during ingest                                                  | Stale-live harder to diagnose from logs alone                                 |
| LS-05 | Overlap risk documented in 01-2; mitigated by detector tick lock + cron locks + live prediction lock                          | Residual under Redis outage                                                   |

---

## 3. Changes

| Area                       | File                                                                                                                                                                  | Change                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Readiness                  | [evaluate.ts](../lib/fixtures/readiness/evaluate.ts), [persist.ts](../lib/fixtures/readiness/persist.ts), [types.ts](../lib/fixtures/readiness/types.ts)              | `livePollingEnabled` input; `live_sync` → `unavailable` + `live_polling_disabled`; `gates.liveDataCurrent` false when polling off; `artifacts.live.pollingEnabled` |
| Ingest isolation           | [ingest-live-tick.ts](../lib/live/ingest-live-tick.ts)                                                                                                                | Fixture + events fetch required; statistics fetch failure → keep DB stats, still upsert fixture/events, structured `statistics_fetch_isolated_failure` log         |
| Live probability read path | [resolve-live-probability-delta.ts](../lib/live/resolve-live-probability-delta.ts), [live-prediction-validation.ts](../lib/predictions/live-prediction-validation.ts) | Align LIVE rows with fixture state before API/UI (see [05-2](./05-2-live-probability-p0.md))                                                                       |
| DB helper                  | [db.ts](../lib/predictions/db.ts)                                                                                                                                     | `resolveLiveFixtureStateByExternalId` for score/minute/sync                                                                                                        |

**Database:** no migration (uses existing `last_provider_sync_at`, `fixture_readiness` JSON).

---

## 4. Update strategy

| Trigger          | Cadence                    | Notes                                              |
| ---------------- | -------------------------- | -------------------------------------------------- |
| Viewer watch     | ~30–40s server poll        | Stops after presence grace                         |
| sync-live-center | 15 min (GHA)               | Requires `LIVE_POLLING_ENABLED=true` on Production |
| reap-stale-locks | 5 min (GHA) + daily Vercel | Seeds follow-notification polls                    |
| Reconcile        | Part of live-center / reap | Finalizes expired DB-live rows                     |

Pre-match → live: official prematch frozen at kickoff (04-1); live model uses anchor only (RC-12).

Live → finished: status transitions in [eventDetector.ts](../lib/live/eventDetector.ts); DB finalize via reconcile; polling stops when status not live.

---

## 5. Tests

| Scenario                                                  | File                                                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Live polling disabled → readiness `live_sync` unavailable | [readiness.test.ts](../lib/fixtures/readiness/readiness.test.ts)                             |
| Stale LIVE row rejected at delta resolver                 | [resolve-live-probability-delta.test.ts](../lib/live/resolve-live-probability-delta.test.ts) |
| Live snapshot validation (2:0 vs 0:0 row)                 | [live-prediction-validation.test.ts](../lib/predictions/live-prediction-validation.test.ts)  |
| Existing reconcile / eventDetector / pipeline tests       | Retained                                                                                     |

---

## 6. API quota implications

- Isolated statistics failure avoids re-fetch loops; one fixture tick still costs 2–3 API calls when stats fail (fixture + events; stats optional).
- Recompute-on-read for stale LIVE (when polling enabled) adds occasional extra model writes, not extra provider calls unless detector rebuild triggers pipeline.

---

## 7. Production / ops verification

| Check                             | Result                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GHA 15 min workflow               | Present: [.github/workflows/ingestion-schedule-15min.yml](../.github/workflows/ingestion-schedule-15min.yml) triggers production cron paths including `sync-live-center` |
| GHA 5 min workflow                | [.github/workflows/ingestion-schedule-5min.yml](../.github/workflows/ingestion-schedule-5min.yml) for `reap-stale-locks`                                                 |
| Vercel env `LIVE_POLLING_ENABLED` | **Not read from this environment** (CLI env listing blocked for secrets). Confirm in Vercel dashboard → Production must be `true` for live ingest                        |
| `CRON_SECRET`                     | Required for GHA triggers; not verified here                                                                                                                             |

If Production still has `LIVE_POLLING_ENABLED` unset/false, live ticks and watch remain disabled while fixture status may still show LIVE from date sync — readiness now surfaces `live_polling_disabled`.

---

## 8. Remaining edge cases

- Redis unavailable: in-memory fallbacks for detector snapshot; polling locks weakened.
- Paused live (`INT`/`SUSP`): live prediction writes blocked; sync may continue at reduced cadence (03-2).
- Extra time / PEN: supported in detector; minute clamp in model tops at 120.
- Presentation-only FT mapping for stale UI rows does not replace DB reconcile.

---

## 9. Verification

| Command                 | Result                               |
| ----------------------- | ------------------------------------ |
| `npm.cmd run typecheck` | Passed                               |
| `npm.cmd run lint`      | 0 errors, 14 warnings (pre-existing) |
| `npm.cmd run test:ci`   | **836 passed** (198 files)           |

---

## Assumptions

1. `last_provider_sync_at` is sufficient persisted freshness signal (no new column).
2. Belgrade lifecycle from 03-2 unchanged.
3. Production URL and secrets are correctly configured in GHA `PRODUCTION_SITE_URL` / `CRON_SECRET`.
4. Enabling live polling on Production is an intentional ops action documented in [LIVE_POLLING.md](../LIVE_POLLING.md).
