# 09-2 — Fixes for 09-1 audit findings

**Date:** 2026-10-11  
**Scope:** P0-1, P0-2, P1-1 … P1-6 from [09-1-final-audit.md](./09-1-final-audit.md). P2 unchanged.

---

## Fixed findings

| ID       | Summary                                                                                              | Files                                                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0-2** | Live AI hero no longer falls back to prematch-linked win bar when `liveWinProbabilities` is null     | `components/ai/AIHeroCard.tsx`, `components/ai/AIHeroCard.test.tsx`                                                                                               |
| **P0-1** | Documented opt-in live polling default; structured log when live fixtures exist but polling disabled | `lib/env.ts`, `.env.example`, `lib/live/live-polling-disabled-signal.ts`, `lib/ingestion/sync-fixtures-today.ts`, `lib/live/live-polling-disabled-signal.test.ts` |
| **P1-1** | Reconcile zombie `ingestion_sync_runs` (>2h running) on reap-stale-locks cron                        | `lib/ingestion/ingestion-sync-state.ts`, `lib/live/reap-stale-locks.ts`, `lib/ingestion/ingestion-sync-state.test.ts`                                             |
| **P1-2** | Match-details sync lookback default **7 days** (was 48h)                                             | `lib/ingestion/config.ts`, `lib/ingestion/sync-match-details.ts`, `lib/ingestion/sync-match-details.test.ts`                                                      |
| **P1-5** | Warm cron evaluates null `fixture_readiness` (budget min(limit, 10)) before AI filter                | `lib/ingestion/warm-ai-prematch.ts`, `lib/ingestion/warm-ai-prematch.test.ts`                                                                                     |
| **P1-3** | Regression test: insufficient history → no prematch persist                                          | `lib/services/predictionService.test.ts` (existing gate in `computeAndPersistPrematch` confirmed)                                                                 |
| **P1-4** | Overview tab form/H2H use point-in-time before kickoff                                               | `components/match/panels/MatchOverviewPanel.tsx`                                                                                                                  |
| **P1-6** | Null live scores → no live feature vector / no live prediction insert                                | `lib/models/live-features.ts`, `lib/services/predictionService.ts`, `lib/live/meaningful-event-pipeline.ts`, `lib/models/live-features.test.ts`                   |

**Database migrations:** none.

**One-time ops (dev Supabase):** Reconciled **16** stuck `ingestion_sync_runs` (`zombie_reconciled`). Ongoing cleanup via `reap-stale-locks` every 5m.

---

## Tests added / updated

- `components/ai/AIHeroCard.test.tsx`
- `lib/live/live-polling-disabled-signal.test.ts`
- `lib/ingestion/ingestion-sync-state.test.ts`
- `lib/ingestion/sync-match-details.test.ts`
- `lib/ingestion/warm-ai-prematch.test.ts`
- `lib/models/live-features.test.ts`
- `lib/services/predictionService.test.ts` (insufficient history)

**CI:** `npm.cmd run test:ci` — **207 files, 879 tests passed**. `npm.cmd run lint` — 0 errors (existing warnings only). `npm.cmd run typecheck` — pass.

---

## Three-fixture verification (post-change, read-only SQL)

| Provider ID | Role                        | Status             | Notes                                                                                    |
| ----------- | --------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| **1558652** | Upcoming                    | NS                 | `fixture_readiness` still null until evaluate/warm; no prematch row yet (Westerlo depth) |
| **1575183** | Live                        | 1H, `is_live=true` | `prediction_ready=false`; events 0 at query time — live UX still env-dependent           |
| **1629006** | Finished                    | FT                 | 19 events, prematch prediction + insight present                                         |
| **1635578** | Finished (detail gap class) | FT                 | 0 events — **candidate** for extended lookback after deploy + `sync-match-details` run   |

---

## Score deltas (1–10, honest)

| Area                  | 09-1 | 09-2    |
| --------------------- | ---- | ------- |
| Ingestion reliability | 7    | **8**   |
| Data correctness      | 8    | **8–9** |
| Fixture lifecycle     | 8    | **8–9** |
| Observability         | 6    | **7**   |
| Live system           | 7    | **7–8** |

---

## Behavior deltas

1. **Live match page:** If live model probabilities are unavailable, the hero shows narrative/key factors only — not prematch percentages mislabeled as live.
2. **Live scoring:** Missing provider scores no longer coerce to 0–0 for model input.
3. **Overview tab:** Recent form and H2H exclude matches on or after kickoff (PIT).
4. **Crons:** `sync-match-details` can backfill FT fixtures up to 7 days; warm cron can persist readiness for NS rows missing JSON; reap cron reconciles stuck sync run rows.

---

## Remaining risks

- **P0-1 (Production):** `LIVE_POLLING_ENABLED` must be set **`true` explicitly on Vercel Production** — code default remains `false`.
- **1635578** events still require a successful `sync-match-details` ingest after deploy.
- **Model calibration** (e.g. heavy home favorites) — out of scope; not a data-integrity bug.

---

## Production readiness

Unchanged headline: **prematch/finished strong**; **live** requires Production env + polling freshness. Code guards from 09-2 reduce misleading live UI and improve ingestion hygiene.

**Commands used:**

```bash
npm.cmd run test:ci
npm.cmd run lint
npm.cmd run typecheck
```
