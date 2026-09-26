# Phase 4 — Production verification (approved RCA)

## Goals (strict scope)

1. **Postgres coverage** — upcoming 7d fixtures, `prematch_readiness.aiEligible`, PREMATCH `ai_insights` count, stuck `ingestion_sync_runs`.
2. **Production cron probes** — unauthenticated GET must return **401** or **503** (route deployed, auth enforced) for Phase 2 routes.
3. **Fixture walk** — sample 2 FT fixtures with PREMATCH insight + 2 upcoming without insight (from DB, no hardcoded IDs).
4. **Report** — `docs/rca/PHASE-4-VERIFICATION-REPORT.md` regenerated via `--write-report`.
5. **DoD** — `npm run rca:phase4:check`.

Operational cleanup (dev): stale `running` backfill rows older than 2h should be marked `failed` before strict verify passes.

## Commands

| Script                                                     | Purpose                                   |
| ---------------------------------------------------------- | ----------------------------------------- |
| `npm.cmd run rca:phase4:verify`                            | Human-readable report + warnings          |
| `npm.cmd run rca:phase4:verify -- --strict --write-report` | Exit 1 on blockers; update report         |
| `npm.cmd run rca:phase4:check`                             | Phase 3 gate + unit tests + strict verify |

## Blocking vs warning

**Fail (--strict):** stuck sync runs; cron route 404/5xx.

**Warn only:** zero `aiEligible` upcoming; eligible but no insights; incomplete fixture walk samples.

## Status

Implemented 2026-09-26.

## Files

| Area   | Path                                          |
| ------ | --------------------------------------------- |
| Logic  | `lib/ingestion/rca-prod-verification.ts`      |
| CLI    | `scripts/rca-phase4-prod-verify.ts`           |
| Tests  | `lib/ingestion/rca-prod-verification.test.ts` |
| DoD    | `scripts/phase4-rca-check.mjs`                |
| Report | `docs/rca/PHASE-4-VERIFICATION-REPORT.md`     |
