# Audit 01-1 — API-Football ingestion paths and client reliability

**Date:** 2026-10-07  
**Starting map:** [00-architecture-map.md](./00-architecture-map.md) (verified against repo)  
**Scope:** Part A audit + Part B client reliability fixes

---

## 1. Audit summary

### Stack (confirmed)

Next.js App Router, Supabase Postgres, Upstash Redis, API-Football (`v3.football.api-sports.io`). All provider HTTP flows through [`lib/api-football/client.ts`](../../lib/api-football/client.ts) → endpoint wrappers → adapters → [`lib/ingestion/upsert.ts`](../../lib/ingestion/upsert.ts) / [`lib/ingestion/match-details-upsert.ts`](../../lib/ingestion/match-details-upsert.ts).

**Map correction:** [`app/api/cron/sync-fixtures-future/route.ts`](../../app/api/cron/sync-fixtures-future/route.ts) is present and wired; the architecture map’s “WIP/uncommitted route” note is stale.

### Authoritative ingestion by data type

| Data type                                     | Authoritative scheduled path                                                                                                                                                                                                                                                                                                                                                                      | Other paths                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fixtures**                                  | [`sync-fixtures`](../../lib/ingestion/sync-fixtures.ts) (daily), [`sync-fixtures-today`](../../lib/ingestion/sync-fixtures-today.ts) (15m GHA), [`sync-fixtures-future`](../../lib/ingestion/sync-fixtures-future.ts), [`sync-league-season-fixtures`](../../lib/ingestion/sync-league-season-fixtures.ts), [`backfill-historical-fixtures`](../../lib/ingestion/backfill-historical-fixtures.ts) | [`ensure-fixture-persisted`](../../lib/ingestion/ensure-fixture-persisted.ts), [`fixture-provider-fill`](../../lib/services/fixture-provider-fill.ts), live [`ingest-live-tick`](../../lib/live/ingest-live-tick.ts) / [`ingest-live-center-tick`](../../lib/live/ingest-live-center-tick.ts) |
| **Events / statistics / player performances** | [`sync-match-details`](../../lib/ingestion/sync-match-details.ts) → [`ingestMatchDetailsFromProvider`](../../lib/ingestion/ingest-match-details.ts)                                                                                                                                                                                                                                               | Inline match-details in daily `sync-fixtures` for today/tomorrow; live tick on `changeFlags`; [`ensure-match-overview`](../../lib/ingestion/ensure-match-overview.ts)                                                                                                                         |
| **Lineups**                                   | [`sync-lineups`](../../lib/ingestion/sync-lineups.ts) → [`ingestLineupsFromProvider`](../../lib/ingestion/ingest-lineups.ts)                                                                                                                                                                                                                                                                      | `ingestMatchDetailsFromProvider`, overview hydrate                                                                                                                                                                                                                                            |
| **Standings**                                 | [`sync-standings`](../../lib/ingestion/sync-standings.ts) (skips provider fetch if rows exist)                                                                                                                                                                                                                                                                                                    | `ingestStandingsForLeagueSeason` from overview hydrate                                                                                                                                                                                                                                        |
| **Reference data**                            | [`bootstrap-static-data`](../../lib/ingestion/bootstrap-static-data.ts)                                                                                                                                                                                                                                                                                                                           | Entity refs during fixture/match upserts                                                                                                                                                                                                                                                      |
| **Sidelined**                                 | No dedicated cron; [`ingest-sidelined`](../../lib/ingestion/ingest-sidelined.ts) where wired                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                                                                                                                             |
| **Analytics / predictions / AI**              | [`refresh-analytics`](../../lib/ingestion/refresh-analytics.ts) (Postgres-only)                                                                                                                                                                                                                                                                                                                   | Overview may call H2H/last-fixtures endpoints                                                                                                                                                                                                                                                 |

### Ingestion status: where it is written and read

| Mechanism                       | Write                                                                                                                              | Read                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `ingestion_sync_runs`           | [`startIngestionSyncRun` / `finishIngestionSyncRun`](../../lib/ingestion/ingestion-sync-state.ts) — backfill, sync-fixtures-future | Diagnostics, RCA scripts                                                       |
| `ingestion_league_season_state` | [`upsertLeagueSeasonSyncState`](../../lib/ingestion/ingestion-sync-state.ts)                                                       | League-season sync, backfill                                                   |
| `ingestion_team_sync_state`     | Backfill / gap-fill modules                                                                                                        | Diagnostics                                                                    |
| `fixtures.prematch_readiness`   | [`fixture-prematch-readiness.ts`](../../lib/ingestion/fixture-prematch-readiness.ts)                                               | AI warm, eligibility                                                           |
| Stdout JSON                     | [`logIngestionEvent`](../../lib/ingestion/ingestion-observability.ts) via [`cron-run.ts`](../../lib/ingestion/cron-run.ts)         | Vercel / GHA logs                                                              |
| Cron `skipped: true`            | Lock not acquired, live polling off, lineups kill-switch, quota skip, etc.                                                         | Schedulers → HTTP 200 ([`cronJobHttpStatus`](../../lib/ingestion/cron-run.ts)) |
| Per-job `ok` / `reason`         | e.g. [`IngestMatchDetailsResult`](../../lib/ingestion/ingest-match-details.ts), `SyncLineupsResult`                                | Cron JSON; not always persisted                                                |

**Important:** `skipped: true` on cron responses is an operational no-op (HTTP 200), not a substitute for provider success. Provider failures must surface as throws, `ok: false`, or [`optionalProviderFetch`](../../lib/api-football/safe-call.ts) `{ ok: false, reason }` — never as silent empty arrays from the client.

### Concurrent processing of the same fixture

| Layer            | Protection                                                         | Gap                                                                                                                             |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Same cron job    | `lock:cron:{jobName}`                                              | Different jobs can overlap                                                                                                      |
| Live poll        | `lock:fixture:{id}:poll`, detector lock                            | Batch crons do not use these                                                                                                    |
| Overview hydrate | `lock:overview-hydrate:{fixtureId}`                                | Does not cover live tick or sync-match-details                                                                                  |
| API dedup        | In-memory + Redis in [`dedup.ts`](../../lib/api-football/dedup.ts) | Cross-instance duplicate calls possible after lock wait timeout                                                                 |
| Events DB        | Unique `(fixture_id, provider_event_id)`                           | [`upsertFixtureEvents`](../../lib/ingestion/match-details-upsert.ts) delete-all-then-insert — concurrent writers can interleave |

Fixture row upserts are idempotent; **fixture_events** is the main corruption risk under overlapping ingest paths. This task did not add fixture-level DB locks.

---

## 2. Root causes (client reliability, pre-fix)

1. No **request timeout** on `fetch` — hung connections could stall crons.
2. **Retry-After** on HTTP 429 ignored — fixed backoff only.
3. No **jitter** on retries — retry storms under load.
4. No **structured client logging** (path, outcome, duration, attempts).
5. **Malformed JSON** surfaced as generic errors, not classified permanent parse failures with path context.
6. **Weak envelope validation** — invalid shapes could be treated like empty data.
7. **Throw-only API** — no typed outcome for success / empty-valid / provider error / retryable / permanent.
8. **All exhausted 429s** mapped to `ApiFootballQuotaError` — conflated minute rate limit with daily exhaustion.
9. **Dedup** on `LockNotAcquiredError` immediately re-ran `fn()` — duplicate provider calls across instances.

---

## 3. Files changed

| File                                                                           | Change                                                                                                 |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [`lib/api-football/fetch-outcome.ts`](../../lib/api-football/fetch-outcome.ts) | **New** — typed outcomes, envelope validation, Retry-After parsing, logging helper, error mapping      |
| [`lib/api-football/client.ts`](../../lib/api-football/client.ts)               | `apiFootballFetchOutcome`, timeout, Retry-After + jitter retries, parse/validate body, structured logs |
| [`lib/api-football/config.ts`](../../lib/api-football/config.ts)               | `requestTimeoutMs`, `retry.randomize`, dedup wait settings                                             |
| [`lib/api-football/errors.ts`](../../lib/api-football/errors.ts)               | `retryAfterMs` on `ApiFootballError`, `ApiFootballRateLimitError`, `isRetryableApiFootballError`       |
| [`lib/api-football/dedup.ts`](../../lib/api-football/dedup.ts)                 | Wait for in-flight coalescing before fallback `fn()`                                                   |
| [`lib/api-football/safe-call.ts`](../../lib/api-football/safe-call.ts)         | Treat rate-limit errors as optional provider failures                                                  |
| [`lib/api-football/client.test.ts`](../../lib/api-football/client.test.ts)     | Expanded reliability matrix                                                                            |
| [`docs/audit/01-1-ingestion-client.md`](./01-1-ingestion-client.md)            | This report                                                                                            |

No database migrations.

---

## 4. Tests added

In [`lib/api-football/client.test.ts`](../../lib/api-football/client.test.ts):

- HTTP 200 valid empty (`kind: "empty"`, `results: 0`)
- HTTP 200 + provider error (existing; unchanged behavior)
- HTTP 429 exhausted → `ApiFootballQuotaError` when day remaining is 0
- HTTP 429 exhausted → `ApiFootballRateLimitError` when day quota not exhausted
- HTTP 500 retry then success
- Request timeout (DOMException `TimeoutError`) retry then success
- Malformed JSON body → permanent failure (throws, not `[]`)
- `apiFootballFetchResponse` throws on provider error (does not return empty array)
- `parseRetryAfterMs` seconds parsing

---

## 5. Remaining risks

1. **Concurrent event upserts** across crons/live/hydrate without a shared fixture-level lock.
2. **Cron `skipped: true` + HTTP 200** still hides disabled live polling / quota skip from naive alerting (by design for schedulers).
3. **Minute quota** (`minuteRemaining`) is recorded but not used to throttle normal-priority requests (day low-budget gate only).
4. **Cross-instance dedup** after lock wait timeout may still duplicate calls.
5. **Typecheck locally** may fail on corrupted `.next/dev/types/routes.d.ts` (see §6).

---

## 6. Local verification commands

```bash
npm.cmd run test:ci
npm.cmd run lint
npm.cmd run typecheck
```

**Results (2026-10-07, after changes):**

| Command                 | Result                                                                                                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run test:ci`   | **698 passed** (167 files), was 691 at architecture map baseline                                                                                                                                            |
| `npm.cmd run lint`      | **0 errors**, 14 warnings (pre-existing + minor unused `_path` in tests)                                                                                                                                    |
| `npm.cmd run typecheck` | **Failed** — parse errors in `.next/dev/types/routes.d.ts` (generated Next dev types). Same class of failure noted in [00-architecture-map.md](./00-architecture-map.md) §9. Not caused by this change set. |

---

## 7. Exact behavior changes

| Area                             | Before                                   | After                                                                                                   |
| -------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Public API**                   | `apiFootballFetch` throws on failures    | Same; plus exported **`apiFootballFetchOutcome`** for typed results                                     |
| **HTTP 200 + provider `errors`** | Throw `ApiFootballError`                 | Unchanged (outcome `provider_error` → throw)                                                            |
| **HTTP 200 + valid empty**       | Returned envelope / `[]`                 | Classified as outcome **`empty`** when `results === 0`; still returns `[]` via `FetchResponse`          |
| **Malformed / empty body**       | `response.json()` throw or weak handling | **Permanent** outcome → `ApiFootballError` with explicit message                                        |
| **Timeout**                      | No limit                                 | **`AbortSignal.timeout(30_000)`**; timeouts retried as retryable (503-class retry path)                 |
| **429 retries**                  | Fixed exponential backoff                | Backoff + **`randomize: true`** + extra wait to honor **`Retry-After`** when larger than computed delay |
| **Exhausted 429**                | Always `ApiFootballQuotaError`           | **`ApiFootballQuotaError`** if `dayRemaining === 0`; else **`ApiFootballRateLimitError`**               |
| **Logging**                      | None at client                           | One JSON line per request: path, outcome, httpStatus, durationMs, attempts                              |
| **Dedup**                        | Lock miss → immediate second `fn()`      | Poll in-flight map up to **2s** before fallback `fn()`                                                  |

---

## Assumptions

1. API-Sports **`Retry-After`** is either delta-seconds or an HTTP-date (parsed per RFC common practice).
2. **30s** request timeout is acceptable for Vercel cron / serverless (matches prior max retry cap order of magnitude).
3. **Fixture-level ingest locking** for events is out of scope for this task; documented as follow-up if event corruption is observed in prod.
4. **`apiFootballFetch` throw semantics** remain the contract for all endpoint wrappers; outcomes are for diagnostics and future callers.
5. Typecheck failure on `.next/dev/types` reflects local dev cache state, not TS errors in `lib/api-football/*`.
