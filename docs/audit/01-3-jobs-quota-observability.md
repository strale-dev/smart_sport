# Audit 01-3 — Bounded jobs, quota protection, observability

**Date:** 2026-10-07  
**Prerequisites:** [01-1-ingestion-client.md](./01-1-ingestion-client.md), [01-2-fixture-ingestion.md](./01-2-fixture-ingestion.md)

---

## 1. Audit summary (pre-implementation)

Production cron routes are invoked from GitHub Actions via [`scripts/trigger-production-cron.mjs`](../../scripts/trigger-production-cron.mjs) with a **58s HTTP timeout**. In-process work should stay under [`CRON_INGEST_WALL_CLOCK_BUDGET_MS`](../../lib/ingestion/cron-budget.ts) (48s). Vercel route `maxDuration` does not extend the GHA client cap.

| Job                            | Batching                     | Wall-clock budget (before) | Checkpoint / resume (before)    |
| ------------------------------ | ---------------------------- | -------------------------- | ------------------------------- |
| `sync-fixtures-today`          | Live-first priority          | Yes                        | Same UTC date re-run            |
| `sync-live-center`             | Allowlist                    | Yes                        | Same-day re-run                 |
| `warm-ai-prematch`             | Candidate caps               | Yes                        | Cache idempotency only          |
| `sync-match-details`           | Env batch size               | **No**                     | `match_ingestion_state`         |
| `sync-fixtures-future`         | Full horizon + league-season | **No**                     | `ingestion_sync_runs` only      |
| `sync-fixtures`                | Date window + freshness skip | **No**                     | Per-date skip                   |
| `sync-lineups`                 | Batch + window               | **No**                     | `fixtureNeedsLineupSync`        |
| `backfill-historical-fixtures` | League-season                | **No** (CLI)               | `ingestion_league_season_state` |

**Quota (existing, retained):** Client `priority` + low-budget refuse (01-1), `shouldRunNonCriticalIngestion` for lineups/standings, dedup (01-1), incremental skips.

**Concurrency gaps:** Lineups writes did not use the fixture match-details Redis lock (01-2).

---

## 2. Root causes

1. **`sync-fixtures-future` unbounded** — Could scan 21+ UTC days and all tier-1 league-season pages in one HTTP invocation while GHA caps at 58s; route `maxDuration = 300` was misleading.
2. **No generic job cursor** — Only league-season backfill checkpoints; daily future sync could not resume mid-horizon.
3. **Missing wall-clock guards** — `sync-match-details`, `sync-lineups`, and `sync-fixtures` had batch/date limits but no shared 48s budget.
4. **Thin structured logs** — Most ingest paths relied on cron envelope + console; fixture-level outcomes were not consistently JSON-logged.
5. **Lineups vs match-details overlap** — Lineups upsert without `withFixtureMatchDetailsLock`.
6. **Silent PostHog failure** — `captureIngestionCronCompleted(...).catch(() => {})` swallowed errors.

---

## 3. Files changed

| File                                                                                                   | Change                                                      |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [`lib/ingestion/ingestion-job-checkpoint.ts`](../../lib/ingestion/ingestion-job-checkpoint.ts)         | **New** — read/upsert/clear job cursors                     |
| [`lib/ingestion/sync-fixtures-future-cursor.ts`](../../lib/ingestion/sync-fixtures-future-cursor.ts)   | **New** — parse/resolve future-sync cursor phases           |
| [`lib/ingestion/sync-fixtures-future.ts`](../../lib/ingestion/sync-fixtures-future.ts)                 | Budget + checkpoint date scan + bounded league-season phase |
| [`lib/ingestion/sync-league-season-fixtures.ts`](../../lib/ingestion/sync-league-season-fixtures.ts)   | `syncLeagueSeasonFixturesBounded` with budget callback      |
| [`lib/ingestion/cron-budget.ts`](../../lib/ingestion/cron-budget.ts)                                   | `createCronIngestBudget` helper                             |
| [`lib/ingestion/sync-match-details.ts`](../../lib/ingestion/sync-match-details.ts)                     | Wall-clock budget + partial outcome stats                   |
| [`lib/ingestion/sync-lineups.ts`](../../lib/ingestion/sync-lineups.ts)                                 | Budget + `resolveCronOutcome` on errors                     |
| [`lib/ingestion/sync-fixtures.ts`](../../lib/ingestion/sync-fixtures.ts)                               | Budget on date/fixture loops + partial outcome              |
| [`lib/ingestion/backfill-historical-fixtures.ts`](../../lib/ingestion/backfill-historical-fixtures.ts) | Optional `BACKFILL_WALL_CLOCK_BUDGET_MS`                    |
| [`lib/ingestion/ingestion-observability.ts`](../../lib/ingestion/ingestion-observability.ts)           | Extended payload + `logFixtureIngestUnit`                   |
| [`lib/ingestion/ingest-match-details.ts`](../../lib/ingestion/ingest-match-details.ts)                 | Structured unit log per invocation                          |
| [`lib/ingestion/ingest-lineups.ts`](../../lib/ingestion/ingest-lineups.ts)                             | Write lock + unit log                                       |
| [`lib/ingestion/fixture-resource-fetch.ts`](../../lib/ingestion/fixture-resource-fetch.ts)             | Log provider fetch failures                                 |
| [`lib/ingestion/cron-run.ts`](../../lib/ingestion/cron-run.ts)                                         | Log PostHog capture failures                                |
| [`app/api/cron/sync-fixtures-future/route.ts`](../../app/api/cron/sync-fixtures-future/route.ts)       | `maxDuration` 300 → 60 (align with GHA reality)             |
| [`types/supabase.ts`](../../types/supabase.ts)                                                         | `ingestion_job_checkpoints` types                           |
| Test files                                                                                             | See §5                                                      |
| This report                                                                                            | Deliverable                                                 |

---

## 4. Database changes

**Migration `0038_ingestion_job_checkpoints`** (applied to Scorence dev via MCP):

- Table `ingestion_job_checkpoints` (`job_name` PK, `cursor` jsonb, `updated_at` timestamptz), RLS enabled (service role only).

Cursor shape for `sync-fixtures-future`:

- `{ phase: "date_scan", nextUtcDate, anchorUtcDate, horizonDays }`
- `{ phase: "league_season", leagueProviderIds, nextIndex, anchorUtcDate, horizonDays }`

Invalidated when `anchorUtcDate` or `horizonDays` no longer matches the run anchor.

---

## 5. Tests added

| Area                                 | File                                                |
| ------------------------------------ | --------------------------------------------------- |
| Future cursor parse/resume           | `lib/ingestion/sync-fixtures-future-cursor.test.ts` |
| Time-budget cron outcome             | `lib/ingestion/sync-fixtures-future.test.ts`        |
| Lineups lock miss → retryable        | `lib/ingestion/ingest-lineups.test.ts`              |
| Idempotent fixture upsert (existing) | `lib/ingestion/upsert.fixture.test.ts`              |
| Safe event upsert (existing)         | `lib/ingestion/match-details-upsert.test.ts`        |
| Match-details lock (existing)        | `lib/ingestion/ingest-match-details.test.ts`        |

---

## 6. Verification commands

```bash
npm.cmd run test:ci
npm.cmd run lint
npm.cmd run typecheck
```

**Results (2026-10-07, after changes):**

| Command                 | Result                                                |
| ----------------------- | ----------------------------------------------------- |
| `npm.cmd run test:ci`   | **723 passed** (174 files), +7 tests vs 01-2 baseline |
| `npm.cmd run lint`      | **0 errors**, 13 warnings (pre-existing)              |
| `npm.cmd run typecheck` | **Passed**                                            |

---

## 7. Exact behavior changes

| Area                           | Before                                             | After                                                                                                                                |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `sync-fixtures-future`         | Full horizon + all tier-1 league-season in one run | **48s budget**; persists **checkpoint**; resumes date scan or league index; `FUTURE_LEAGUE_SEASON_BATCH` (default 2) leagues per run |
| `sync-match-details`           | Process full batch regardless of time              | **Stops on budget**; `stoppedForTimeBudget`, `candidatesRemaining`; incomplete fixtures retry via `match_ingestion_state`            |
| `sync-lineups`                 | Always `ok: true` with errors counted              | **`resolveCronOutcome`** — errors → `ok: false`; budget partial → degraded success                                                   |
| `sync-fixtures`                | Always `ok: true`                                  | **Budget** on upsert loop; partial date window; `partialForTimeBudget` when applicable                                               |
| `backfill-historical-fixtures` | Run until done                                     | Optional **`BACKFILL_WALL_CLOCK_BUDGET_MS`** → `stoppedForTimeBudget`, sync run `complete` (resume with `--resume`)                  |
| Lineups persist                | Unlocked upsert                                    | **`withFixtureMatchDetailsLock`** — lock miss → `RETRYABLE_FAILURE`, no write                                                        |
| Ingest logs                    | Cron envelope mostly                               | **`logFixtureIngestUnit`** on match-details/lineups; **`budget_stop`** on crons; provider fetch failures logged                      |
| PostHog cron capture failure   | Swallowed                                          | **Logged** via `logIngestionEvent`                                                                                                   |
| Future cron route              | `maxDuration = 300`                                | **`maxDuration = 60`**                                                                                                               |

---

## 8. API quota implications

- **No reduction of required FT detail sync** — match-details cron still runs when scheduled; only wall-clock bounded.
- **Future date scans** remain normal-priority provider calls; league-season batching spreads heavy `/fixtures?league&season` pagination across days/runs.
- **Lineups/standings** still skip when `shouldRunNonCriticalIngestion()` is false (~8% daily remaining threshold unchanged).
- **Checkpoint resume** avoids re-scanning completed future UTC dates after a budget stop (same day may re-upsert idempotently if stopped mid-day).
- **Dedup / client refuse** (01-1) unchanged.

---

## 9. Remaining risks

1. **Warm-ai-prematch** — Budget stop without persisted cursor (cache idempotency only).
2. **Mid-day future sync stop** — Re-fetches same `/fixtures?date=` on resume (idempotent upserts; one extra API call per interrupted day).
3. **Live tick vs batch** — Non-event resources on live path still outside fixture write lock (01-1/01-2 scope).
4. **Lock unavailable** — Retryable skip; data may lag until lock acquired.
5. **Horizon env change** — Checkpoint invalidated when `FIXTURES_FUTURE_INGEST_DAYS` or UTC anchor date changes.

---

## 10. Ingestion phase summary (01-1 → 01-3)

**01-1 — Client reliability:** Typed fetch outcomes, timeouts, Retry-After + jitter, quota/rate-limit classification, dedup wait, structured API client logs. Foundation for not treating errors as empty data.

**01-2 — Fixture semantics:** Safe upserts (no delete-on-empty), `match_ingestion_state` on fixtures, completeness-based sync, match-details Redis lock for events/performances, explicit NOT_YET vs NO_DATA.

**01-3 — Jobs & ops:** Bounded cron work under GHA 58s cap, **Postgres job checkpoints** for future fixture sync, shared **48s ingest budget** on major crons, **quota-aware skips** unchanged but documented, **fixture-level JSON observability**, lineups under the same write lock, honest sync-run status on budget stop.

Together: provider calls are reliable and classified; persisted football data has explicit partial/failure state; scheduled ingestion **defers** instead of timing out silently and **resumes** without replaying completed horizon days.

---

## Assumptions

1. GHA + [`trigger-production-cron.mjs`](../../scripts/trigger-production-cron.mjs) remain the production scheduler for `sync-fixtures-future` (58s client timeout).
2. Tier-1 league list for league-season phase remains `resolveBackfillLeagueProviderIds(1)`.
3. Default `FUTURE_LEAGUE_SEASON_BATCH = 2` is enough progress per daily run without exhausting budget (tunable via env).
4. Invalidating checkpoints on anchor/horizon mismatch is acceptable (full horizon restart on config change).
5. `sync-fixtures-future` completing league-season phase clears checkpoint; partial league index persists across runs until all leagues processed.
