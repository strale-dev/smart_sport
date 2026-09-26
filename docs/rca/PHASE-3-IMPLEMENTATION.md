# Phase 3 — Regression tests + structured observability (approved RCA)

## Goals (strict scope)

1. **Structured logs (§14)** — `[ingestion]` JSON lines with `job_name`, `stage`, optional `fixture_id`, `error_type` on cron completion, warm-ai per-fixture units, live-center skip gate, and prematch insight unavailable/fallback.
2. **PostHog cron SLO** — `ingestion_cron_completed` from `runCronRoute` (system distinct id `ingestion-cron`).
3. **Regression tests (RCA “prevents recurrence”)** — cron outcome semantics, GHA trigger JSON rules, narrative eligibility, warm degraded counts, future sync strict `ok`, fixture readiness snapshots, `LIVE_POLLING_ENABLED` isolated to live-center (not today sync).
4. **DoD gate** — `npm run rca:phase3:check`.

No new ingestion jobs; no Phase 4 prod fixture walk yet.

## Status

Implemented 2026-09-26.

## File touch list

| Area          | Files                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Observability | `lib/ingestion/ingestion-observability.ts`, wired in `cron-run.ts`, `warm-ai-prematch.ts`, `aiService.ts`, `ingest-live-center-tick.ts`    |
| PostHog       | `lib/posthog/server.ts`, `lib/posthog/events.ts`, `docs/EVENTS.md`                                                                         |
| GHA trigger   | `lib/ingestion/gha-cron-trigger.ts`, `scripts/trigger-production-cron.mjs` (logic kept in sync)                                            |
| Tests         | `ingestion-observability.test.ts`, `gha-cron-trigger.test.ts`, `fixture-prematch-readiness.test.ts`, `live-polling-cron-isolation.test.ts` |
| DoD           | `scripts/phase3-rca-check.mjs`, `package.json` → `rca:phase3:check`                                                                        |

## Manual verification

- Trigger a dev cron route locally; confirm one `[ingestion]` JSON line with `stage: complete`.
- PostHog → Live events → `ingestion_cron_completed` after a production cron (optional).

## Next step

See **Phase 4** — `docs/rca/PHASE-4-IMPLEMENTATION.md` and `npm run rca:phase4:check`.
