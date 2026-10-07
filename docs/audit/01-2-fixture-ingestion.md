# Audit 01-2 — Fixture and match-details ingestion

**Date:** 2026-10-07  
**Prerequisite:** [01-1-ingestion-client.md](./01-1-ingestion-client.md)

---

## 1. Audit summary

Fixture row ingestion (`ingestFixtureFromRaw` → `upsertFixtureRow` on `provider_id`) was already idempotent and correct for home/away, league/season, UTC kickoff storage, and terminal status handling (including PST/CANC/ABD).

The main production gaps were in **match-details semantics** and **destructive writes**:

- Empty provider arrays caused **delete-all-then-insert** on `fixture_events` and `player_match_performances`, wiping valid data.
- `IngestMatchDetailsResult.ok` was true when **any** sub-fetch succeeded (`anyProviderOk`).
- `fixtureHasMatchDetails` (events with player linkage only) was used as a proxy for “fixture ready.”
- No persisted per-fixture state for incomplete dependencies.
- Lineups errors inside match-details were silently caught.

Live polling overlap with batch ingest remains a documented risk ([01-1](./01-1-ingestion-client.md)); not changed in this task.

---

## 2. Root causes

1. **Destructive empty snapshots** — `upsertFixtureEvents` / `upsertPlayerMatchPerformances` always deleted existing rows before insert; HTTP 200 + `[]` was treated like a full snapshot.
2. **No NOT_YET vs NO_DATA** — Callers could not distinguish pre-match empty responses from finished-match empty responses.
3. **Weak aggregate success** — Partial provider success reported as `ok: true`.
4. **Readiness proxy** — Sync/hydrate used event-only checks, ignoring statistics/lineups/performances expectations by competition.
5. **Concurrent writers** — Delete-then-insert amplified race risk across crons/hydrate/live (mitigated with upsert + Redis lock, not eliminated if lock unavailable).

---

## 3. Files changed

| File                                                                                                                                                         | Change                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [lib/ingestion/ingestion-result.ts](../../lib/ingestion/ingestion-result.ts)                                                                                 | **New** — outcomes, availability classification, aggregation, persistence, completeness evaluation |
| [lib/ingestion/fixture-resource-fetch.ts](../../lib/ingestion/fixture-resource-fetch.ts)                                                                     | **New** — provider fetch wrapper + safe write gating                                               |
| [lib/ingestion/fixture-match-details-lock.ts](../../lib/ingestion/fixture-match-details-lock.ts)                                                             | **New** — Redis lock for event/performance writes                                                  |
| [lib/ingestion/ingest-match-details.ts](../../lib/ingestion/ingest-match-details.ts)                                                                         | Structured outcomes, persist state, skip PST/CANC/ABD, no silent lineup catch                      |
| [lib/ingestion/ingest-lineups.ts](../../lib/ingestion/ingest-lineups.ts)                                                                                     | `optionalProviderFetch` path, availability, outcomes                                               |
| [lib/ingestion/match-details-upsert.ts](../../lib/ingestion/match-details-upsert.ts)                                                                         | Safe upserts, `getFixtureIngestContext`, statistics partial result                                 |
| [lib/ingestion/sync-match-details.ts](../../lib/ingestion/sync-match-details.ts)                                                                             | Completeness-based candidates, cron degraded on failures                                           |
| [lib/ingestion/sync-fixtures.ts](../../lib/ingestion/sync-fixtures.ts)                                                                                       | Completeness-based inline detail ingest                                                            |
| [lib/ingestion/ensure-match-overview.ts](../../lib/ingestion/ensure-match-overview.ts)                                                                       | Outcome-aware failures + incomplete dependency logging                                             |
| [lib/live/ingest-live-tick.ts](../../lib/live/ingest-live-tick.ts)                                                                                           | Statistics upsert return type                                                                      |
| [lib/redis/keys.ts](../../lib/redis/keys.ts)                                                                                                                 | `fixtureMatchDetailsLockKey`                                                                       |
| [types/supabase.ts](../../types/supabase.ts)                                                                                                                 | New fixture columns                                                                                |
| [supabase/migrations/20261007150000_0037_fixture_match_ingestion_state.sql](../../supabase/migrations/20261007150000_0037_fixture_match_ingestion_state.sql) | Migration                                                                                          |
| Test files under `lib/ingestion/*.test.ts`                                                                                                                   | See §5                                                                                             |

---

## 4. Database changes

**Migration `0037_fixture_match_ingestion_state`** (applied to Scorence dev via MCP):

- `fixtures.match_ingestion_state jsonb` — dependency-level outcomes (`SUCCESS` / `PARTIAL` / `SKIPPED` / `RETRYABLE_FAILURE` / `PERMANENT_FAILURE`) and availability (`NOT_YET_AVAILABLE` / `PROVIDER_RETURNED_NO_DATA` / `AVAILABLE`).
- `fixtures.match_ingestion_updated_at timestamptz` — UTC last update.

Existing uniques retained: `fixtures.provider_id`, `fixture_events (fixture_id, provider_event_id)`, `fixture_statistics (fixture_id, team_id)`, `lineups (fixture_id, team_id)`.

---

## 5. Tests added

| Area                                             | File                                           |
| ------------------------------------------------ | ---------------------------------------------- |
| Outcome aggregation / PST / empty classification | `lib/ingestion/ingestion-result.test.ts`       |
| Safe write gating / retryable mapping            | `lib/ingestion/fixture-resource-fetch.test.ts` |
| Duplicate event upsert / no delete on empty      | `lib/ingestion/match-details-upsert.test.ts`   |
| Postponed / cancelled / partial ingestion        | `lib/ingestion/ingest-match-details.test.ts`   |
| Missing lineup NOT_YET                           | `lib/ingestion/ingest-lineups.test.ts`         |
| Duplicate fixture upsert                         | `lib/ingestion/upsert.fixture.test.ts`         |

---

## 6. Verification commands

```bash
npm.cmd run test:ci
npm.cmd run lint
npm.cmd run typecheck
```

**Results (2026-10-07, after changes):**

| Command                 | Result                                                 |
| ----------------------- | ------------------------------------------------------ |
| `npm.cmd run test:ci`   | **716 passed** (173 files), +18 tests vs 01-1 baseline |
| `npm.cmd run lint`      | **0 errors**, 13 warnings (pre-existing)               |
| `npm.cmd run typecheck` | **Passed**                                             |

---

## 7. Exact behavior changes

| Area                            | Before                          | After                                                                                                 |
| ------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Empty events/performances fetch | Delete all DB rows, insert zero | **No delete** unless non-empty snapshot or confirmed `PROVIDER_RETURNED_NO_DATA` write policy         |
| Event persistence               | Delete-all + insert             | **Upsert** on `(fixture_id, provider_event_id)` + orphan cleanup when snapshot non-empty              |
| Ingest result                   | `ok` + optional `reason`        | **`outcome`** + persisted `match_ingestion_state`                                                     |
| PST/CANC/ABD details            | Fetched like other statuses     | **`SKIPPED`** with `fixture_status_*` reason                                                          |
| Pre-match empty lineups/stats   | `ok: true`, count 0             | **`NOT_YET_AVAILABLE`** → `SKIPPED` with explicit reason                                              |
| Sync-match-details cron         | Always `ok: true`               | **`ok: false`, `degraded: true`** when batch has retryable/permanent failures                         |
| Readiness for sync              | `fixtureHasMatchDetails` only   | **`evaluateFixtureDependencyCompleteness`** by status + competition capabilities                      |
| Lineups inside match-details    | Swallowed in `catch`            | Propagates via lineups **dependency record** / aggregate **PARTIAL**                                  |
| Concurrent event writes         | Unlocked delete+insert          | **Redis lock** `lock:fixture:{providerId}:match-details`; lock miss → **RETRYABLE_FAILURE**, no write |

---

## 8. Remaining risks

1. **Live tick + batch ingest** — Lock reduces event corruption; live path still uses legacy upsert patterns for some flags (out of scope).
2. **Lock unavailable** — Write skipped with retryable outcome rather than unsafe delete.
3. **UTC “today” for fixture date crons** — Unchanged; Belgrade used for UI/display elsewhere.
4. **Statistics with one team row** — Treated incomplete until two teams or explicit NOT_YET window.

---

## Assumptions

1. Synthetic `buildExternalEventId` remains the dedupe key for events.
2. JSON `match_ingestion_state` is sufficient to identify incomplete FT fixtures without a separate table.
3. `sync-fixtures-today` continues to use UTC calendar date for the provider `date` parameter.
4. Live polling behavior unchanged in this task.
