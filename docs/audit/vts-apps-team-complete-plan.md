# VTŠ Apps Team — complete plan (Scorence)

**Date:** 2026-11-01  
**Assignment branch:** `assignment/vts-apps-team` @ `4ef623e`  
**Merged to `origin/main`:** PR [#8](https://github.com/strale-dev/smart_sport/pull/8) (`a922af0`, 2026-11-01 11:17 UTC)  
**Local vs remote:** branch is **1 commit ahead** of `origin/assignment/vts-apps-team` (`4ef623e` — sync CLI tsconfig). That commit is **not** on `origin/main`.  
**Supabase:** Scorence project `zovobemlpqoclyjhvkpw` via MCP `user-supabasei` (read-only for this report).

This document records what the assignment actually shipped, how it was verified, and what it **does not** claim to fix.

---

## 1. Assignment vs operational backlog

| The assignment solves                                                                                 | Still operational / product backlog                                                             |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Honest fixtures freshness (`providerSyncedAt`, not Redis `cachedAt`)                                  | Green ingestion on every cron                                                                   |
| Distinct “provider unavailable” empty state vs “no matches today”                                     | Redis host restore (Upstash `ENOTFOUND`)                                                        |
| Classified `error_type` on **`sync-fixtures-today` fetch catch**                                      | Wire `classifyProviderError` on other jobs (`sync-fixtures-future` still stores `fetch failed`) |
| Redis **fail-open** so `/dashboard` and `/fixtures` do not crash when cache/locks/quota Redis is down | Stale `NS` after kickoff (~1207 rows, fixtures plan D2)                                         |
| Evidence-based audit trail (09-1 / 09-2 + this pack)                                                  | `LIVE_POLLING_ENABLED` Production value (09-1 P0-1)                                             |

User-visible ingestion errors after this work are **expected degraded operation**, not a VTS regression. See [AI-INGESTION-RCA.md](../rca/AI-INGESTION-RCA.md) and [vts-apps-team-deficiencies.md](./vts-apps-team-deficiencies.md).

---

## 2. Phase status (recon 2026-11-01)

| Phase                     | Plan intent                                                                                          | Status                | Evidence                                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 Setup**               | Dedicated branch; first audit commit; read-only stuck-run count                                      | **Done**              | Branch from `57e23c1`. Commit `d6c3594` (`09-1`, `09-2`, readiness Sentry mock). MCP `stuck_running_count` was 0 in Phase 1; **still 0** on 2026-11-01 (below).                                |
| **2 Freshness**           | Propagate freshness through `FixturesData` → `/fixtures` Serbian badge; freeze live pulse when stale | **Done**              | `f581944`. `lib/fixtures/provider-synced-at.ts`, `fixturesService.ts`, `StaleBadge` `language="sr"`, `FixturesPageClient`.                                                                     |
| **3 Classify**            | `classifyProviderError` in `sync-fixtures-today` catch + table tests                                 | **Done**              | `159944e`. Helper + `IngestionErrorType` union + catch wiring.                                                                                                                                 |
| **4 Fallback UI + Redis** | Unavailable ≠ empty; Redis fail-open + provider fallback tests                                       | **Done**              | `2b9e112` (`FixturesUnavailableState`), `a6ddf74` (cache/lock/quota fail-open + `footballService` fallback tests). Extra Redis lock/quota hardening `28bed3d` (same branch, after VTS prefix). |
| **5 Docs**                | Complete plan, deficiencies, Learning Diary                                                          | **Done (this pack)**  | This file + `vts-apps-team-deficiencies.md` + `vts-apps-team-learning-diary.md`.                                                                                                               |
| **6 PR / defense**        | PR to `main`; **no merge/deploy without approval**                                                   | **PR merged earlier** | [#8](https://github.com/strale-dev/smart_sport/pull/8) already merged. Teaching/defense still open. **Do not** promote/deploy further from this task.                                          |

Phase 2–4 also picked up later fixtures/live/AI work on the same branch (`23b4678`…`80a2b3d`). That is **out of VTS assignment scope** but rode the same PR.

---

## 3. What shipped (code)

### 3.1 Freshness (Phase 2)

`getFixturesData` now returns:

- `meta` (`CacheMeta`: `cached`, `stale`, `cachedAt`)
- `providerSyncedAt` / `providerSyncSource`
- `freshnessStale`
- `providerUnavailable`

Anchor order in `resolveProviderSyncedAt`: **complete `ingestion_sync_runs`** for `sync-fixtures-today` / `sync-fixtures` → max fixture `lastProviderSyncAt` → league `last_sync_at` → cache envelope.

`cachedAt` is **not** treated as last successful provider sync (it is the cache write time in `lib/redis/cache.ts`).

UI on `/fixtures`:

- Serbian `StaleBadge`: `Ažurirano pre …` / `Nepoznata svežina`
- Warning + muted sentence when `freshnessStale` and a timestamp exist
- `freezeLive` only on the fixtures list when stale

Age stale (30 min = 2 × 15 min cadence) applies only if the window includes **today** or a **live** fixture.

### 3.2 Classify (Phase 3)

`classifyProviderError` maps thrown errors to:

`network` | `timeout` | `provider_error` | `quota_exhausted` | `rate_limited` | `permanent` | `unknown`

plus `retryable` and a redacted `reason`. Wired only in the **top-level fetch catch** of `syncFixturesToday`. Success path unchanged. HTTP 200 + provider `errors` stays classified in `fetch-outcome.ts`; Phase 3 adds a regression test.

### 3.3 Unavailable UI (Phase 4)

`FixturesList` renders `FixturesUnavailableState` only when `isEmpty && providerUnavailable`. A filtered empty league/day stays “No fixtures…”. Copy is Serbian; no hostnames, keys, or raw error strings.

`providerUnavailable` is true only when the window has **zero persisted fixtures** and there is no successful sync evidence (complete run / fixture row / league), or the newest relevant run is `failed`.

### 3.4 Redis fail-open (Phase 4)

`lib/redis/cache.ts` treats Redis get/set exceptions as a miss (log + continue). Locks fall back to in-memory (`lib/redis/lock.ts`). Quota/dedup paths have matching tests (`footballService.redis-down.test.ts`, `footballService.fallback.test.ts`). This is what stopped the production dashboard crash (`getaddrinfo ENOTFOUND` on Upstash) from becoming `app/error.tsx`.

---

## 4. Tests (assignment-scoped)

| File                                                       | What it proves                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `lib/fixtures/provider-synced-at.test.ts`                  | Source order, stale windows, unavailable vs empty-day-after-complete-run |
| `components/fixtures/FixturesStalenessBadge.test.tsx`      | `language="sr"` + warning variant                                        |
| `lib/ingestion/classify-provider-error.test.ts`            | 7 table cases + HTTP 200 `errors.requests` + secret redaction            |
| `lib/ingestion/sync-fixtures-today.provider-fetch.test.ts` | Catch returns `error_type: "network"` and logs it                        |
| `components/fixtures/FixturesUnavailableState.test.tsx`    | Unavailable vs empty vs list-with-flag                                   |
| `lib/services/footballService.fallback.test.ts`            | Provider/quota → persisted data, not `[]`                                |
| `lib/services/footballService.redis-down.test.ts`          | Redis down does not throw through `cached()`                             |

Phase 1 also landed `lib/services/aiService.readiness.test.ts` Sentry mock (CI flake), not a product feature.

---

## 5. Read-only SQL snapshot (2026-11-01, ~12:45 UTC)

Project `zovobemlpqoclyjhvkpw`. No writes.

### 5.1 `ingestion_sync_runs` health

| Metric                                           | Value |
| ------------------------------------------------ | ----- |
| `stuck_running_count` (`running` + started > 2h) | **0** |
| `running_count`                                  | **0** |
| Rows in last 24h                                 | **3** |
| `complete` in last 24h                           | **0** |
| `failed` in last 24h                             | **3** |

Last 48h rows: **6**, all `job_name = sync-fixtures-future`, `status = failed`, `error_message = 'fetch failed'`, `fixturesUpserted = 0`. Latest: `2026-11-01 09:56:39+00`.

Table columns: `id, job_name, tier, started_at, finished_at, status, stats, error_message`. **No `error_type` column.** Classifier output lives in cron JSON / `[ingestion]` logs for `sync-fixtures-today` only. `sync-fixtures-today` / `sync-fixtures` still **do not** call `startIngestionSyncRun` (Phase 2 plan, confirmed in code).

**D5 / 09-1 P1-1:** zombie bookkeeping is verify-only. Reconcile on `reap-stale-locks` is holding. Failed future syncs are a **different** problem (opaque `fetch failed`, likely network/Redis/provider — not classified on that job).

### 5.2 Fixtures freshness / stale NS

| Metric                           | Value                  |
| -------------------------------- | ---------------------- |
| `fixtures` rows                  | 43,006                 |
| Newest `last_provider_sync_at`   | 2026-11-01 12:42:51+00 |
| Rows synced in last 2h           | 94                     |
| `NS`/`TBD` with kickoff > 3h ago | **1,207**              |

Interpretation: **today-window ingest is partially alive** (94 recent syncs). Horizon/future job is red. Large stale-NS pile is fixtures plan **D2**, not VTS UI work.

---

## 6. Verification (this session)

Targeted:

```text
npm.cmd run test:ci -- lib/fixtures/provider-synced-at.test.ts components/fixtures/FixturesStalenessBadge.test.tsx lib/ingestion/classify-provider-error.test.ts components/fixtures/FixturesUnavailableState.test.tsx lib/services/footballService.fallback.test.ts lib/services/footballService.redis-down.test.ts
```

Plus `npm.cmd run check:ci` (2026-11-01, this session): **typecheck pass**, **lint 0 errors / 12 warnings** (pre-existing), **217 files / 958 tests passed**.

Smoke (local `next dev`):

- `GET /fixtures` — **200** (SSR).
- `GET /api/fixtures` — **200**; `isEmpty=false`, `freshnessStale=false`, `providerUnavailable=false`, `providerSyncSource=fixture_row`, `providerSyncedAt` current, 25 upcoming / 31 past day groups. Badge path is fresh-from-fixture-row (not unavailable). Unavailable vs empty is covered by `FixturesUnavailableState.test.tsx`.
- `GET /dashboard` — **307** (auth redirect), body does **not** contain `This page failed to load`. Desktop Computer Use sidecar was unavailable; no visual click-through.

No `.env` or secrets committed. No API-Football quota burned for classifier tests (mocked). SQL was read-only.

---

## 7. Limits of this assignment

1. **Not a full ingestion green-up.** Partial today-sync (`stoppedForTimeBudget`), warm-ai Sentry noise, skipped live cron when polling is off, and future-sync `fetch failed` remain.
2. **Classifier is one job.** Other crons still log/store unstructured reasons.
3. **Fail-open ≠ Redis restored.** Pages stay up; cache, distributed locks, and quota counters are weaker until Upstash is healthy.
4. **Freshness can fall back to fixture rows** because today/daily fixture jobs do not persist `ingestion_sync_runs`.
5. PR #8 also contains non-VTS fixtures/AI commits. Reviewers should treat `vts:` commits as the assignment core.

---

## 8. Git map (assignment-prefixed)

| SHA       | Message                                                           |
| --------- | ----------------------------------------------------------------- |
| `d6c3594` | `docs(audit): add 09-1 final audit and refresh 09-2 verification` |
| `f581944` | `vts: surface fixture freshness from the last provider sync`      |
| `159944e` | `vts: classify provider fetch errors in sync-fixtures-today`      |
| `a6ddf74` | `vts: fail-open Redis cache and provider fallback tests`          |
| `2b9e112` | `vts: show fixtures unavailable state when sync has no data`      |

Related on the same branch (not `vts:`): `28bed3d` Redis lock/quota fail-open; later fixtures/live/AI Phase 2; `4ef623e` sync CLI tsconfig (local only).
