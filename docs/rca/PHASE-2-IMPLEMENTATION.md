# Phase 2 — Implementation plan (approved RCA)

## Goals (strict scope)

1. **Cron honesty** — `ok: false` + `degraded: true` when work failed partially; GHA trigger parses JSON `ok`.
2. **Fixture prematch readiness** — DB column + evaluator; refresh after today sync; warm-ai prioritizes eligible fixtures.
3. **Historical/future ingest** — Wire `sync-fixtures-future` with sync-run logging, partial-failure semantics, 600s lock.
4. **AI eligibility** — `canGeneratePrematchNarrative`: require `hasMinimumModelSignal`, allow narrative when baseline probs if signal exists; invalidate stale generic cached preds.
5. **Warm coverage** — GHA daily scope every 6h; track `unavailable`; fail cron when degraded counts > 0.
6. **Tests** — cron outcome, narrative eligibility, warm degraded, trigger script behavior (unit).

No architecture rewrite; shared prematch cache + quota unchanged.

## Status

Implemented 2026-09-26. Migration `0035_fixture_prematch_readiness` applied on Scorence dev.

## File touch list

| Area      | Files                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| Migration | `supabase/migrations/20260926150000_0035_fixture_prematch_readiness.sql`                                         |
| Cron      | `cron-run.ts`, `cron-outcome.ts`, `trigger-production-cron.mjs`, `.github/workflows/ingestion-schedule.yml`      |
| Ingestion | `sync-fixtures-future.ts`, `sync-fixtures-today.ts`, `fixture-prematch-readiness.ts`, route lock TTL             |
| AI        | `prematch-availability.ts`, `aiService.ts`, `predictionService.ts`, `warm-ai-prematch.ts`                        |
| Types     | `types/supabase.ts` (regenerate)                                                                                 |
| Tests     | `cron-outcome.test.ts`, `prematch-narrative-eligibility.test.ts`, `warm-ai-prematch.test.ts`, `cron-run.test.ts` |
