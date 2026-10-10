# Audit 03-2 — Fixture readiness model implementation

**Date:** 2026-10-07  
**Prerequisite:** [03-1-readiness-matrix.md](./03-1-readiness-matrix.md)

## Current lifecycle (after change)

Lifecycle phase and gates are computed in [`lib/fixtures/readiness/`](../lib/fixtures/readiness/) and persisted on `fixtures.fixture_readiness` (UTC `evaluatedAt`). Calendar windows for “today”, “upcoming”, and “imminent” use **Europe/Belgrade** via `LIFECYCLE_TIMEZONE`; kickoff storage remains UTC.

Live tracking uses one canonical status set in [`lib/fixtures/live-status.ts`](../lib/fixtures/live-status.ts) (includes `INT`/`SUSP`). Paused live (`INT`/`SUSP`) keeps polling at reduced cadence but blocks new live AI and live probability writes.

## False readiness bugs fixed

| ID    | Fix                                                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 | `getOrComputePrematch` returns `null` outside the 72h compute window instead of serving any aged row                               |
| FR-02 | `storedPredictionMatchesCurrentFeatures` returns `false` when current features are unavailable                                     |
| FR-03 | No post-kickoff PREMATCH insert when no official row exists                                                                        |
| FR-04 | Historical prematch insight read/generate validates `context_hash`; stale insight returns `UNAVAILABLE` (`STALE_PREMATCH_CONTEXT`) |

Regression tests: [`lib/services/predictionService.test.ts`](../lib/services/predictionService.test.ts), [`lib/services/aiService.readiness.test.ts`](../lib/services/aiService.readiness.test.ts).

## Readiness model

- **Module:** [`lib/fixtures/readiness/`](../lib/fixtures/readiness/) — evaluate, gates, persist, lifecycle helpers.
- **Snapshot (`version: 1`):** `phase`, `liveSubState`, `gates`, `artifacts`, `items[]` with explicit states (`missing`, `not_yet_available`, `stale`, `insufficient`, `unavailable`).
- **API:** `GET /api/fixtures/:fixtureId/readiness` returns persisted snapshot (evaluates once if empty).
- **Consumers:** `predictionService`, `aiService`, `warm-ai-prematch`, match auto-ensure (`AIInsightProvider`).

## Files changed (high level)

- New: `lib/fixtures/readiness/*`, `lib/fixtures/live-status.ts`, `app/api/fixtures/[fixtureId]/readiness/route.ts`, migration `20261007180000_0040_fixture_readiness.sql`
- Updated: prediction/AI services, ingestion hooks, live poller, Belgrade date windows (sync/dashboard/top-picks), UI paused label, types

## Database

Migration **0040**:

- Adds `fixture_readiness`, `fixture_readiness_updated_at`
- Drops `prematch_readiness`, `match_ingestion_state` (+ timestamps)
- Recreates `is_live` generated column with `INT`/`SUSP`
- Partial index on `fixture_readiness.gates.aiGenerationAllowed` for NS/TBD

Applied on Scorence dev via Supabase MCP.

## Tests

- [`lib/fixtures/readiness/readiness.test.ts`](../lib/fixtures/readiness/readiness.test.ts) — lifecycle, gates, stale/missing/paused/postponed/finished cases
- FR-01–FR-04 regression tests (see above)

## Verification

| Command                 | Result                               |
| ----------------------- | ------------------------------------ |
| `npm.cmd run typecheck` | Passed                               |
| `npm.cmd run lint`      | 0 errors, 14 warnings (pre-existing) |
| `npm.cmd run test:ci`   | 771 passed (184 files)               |

## Remaining edge cases

- FR-05–FR-14 from 03-1 not fully addressed (xG zero coercion, UI non-PIT form, live AI badge freshness, etc.).
- `persistMatchIngestionState` no longer stores separate JSON; dependency detail lives in evaluated snapshot + DB counts.
- PRD still mentions UTC fixture windows; product now uses Belgrade for lifecycle (documented tension in 03-1).

## Assumptions

1. Belgrade lifecycle timezone applies to ingestion/dashboard/top-picks despite PRD UTC wording.
2. Paused live UX is a minimal “Paused” label; no separate product copy pass.
3. Full `buildPrematchContext` during batch readiness is acceptable for accuracy (hash validation).
4. Warm cron hard-filters on `gates.aiGenerationAllowed` from persisted snapshot (fixtures with stale snapshots rely on window refresh cron).
