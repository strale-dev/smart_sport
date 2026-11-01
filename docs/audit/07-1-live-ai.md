# Audit 07-1 — Meaningful-event detection and live AI

**Date:** 2026-10-11  
**Prerequisites:** [06-1-ai-context.md](./06-1-ai-context.md), [06-2-ai-states.md](./06-2-ai-states.md), [04-1-prematch-prediction.md](./04-1-prematch-prediction.md)  
**Note:** `docs/audit/05-1-*.md` and `05-2-*.md` were not present; live snapshot binding uses `predictions.id` + `computeLiveSnapshotIdentity(input_snapshot)`.

---

## 1. Audit findings (pre-change)

| ID     | Issue                                                    | Impact                                                            |
| ------ | -------------------------------------------------------- | ----------------------------------------------------------------- |
| LAI-01 | No status-transition detection in `eventDetector`        | FT/AET/PEN ticks without new events skipped LLM + live prediction |
| LAI-02 | VAR handling limited to penalty-related strings          | Major VAR (goal ruled out, card upgrade) did not trigger          |
| LAI-03 | Live LLM context lacked structured `latestMatchEvents`   | Narrative relied on triggers only; harder to ground on incidents  |
| LAI-04 | Delta API omitted live `predictionId` / `liveSnapshotId` | UI delta vs AI row could not be verified as same snapshot         |
| LAI-05 | No durable per-event dedup after detector snapshot loss  | Replay could re-call LLM for same provider event id               |
| LAI-06 | Incomplete test matrix for live pipeline                 | Regressions on poll/no-op and burst coalescing under-tested       |

**Already correct (unchanged architecture):**

- Ingest → [fixture-live-ingest-pipeline.ts](../lib/live/fixture-live-ingest-pipeline.ts) → [meaningful-event-pipeline.ts](../lib/live/meaningful-event-pipeline.ts).
- Unchanged ingest skips pipeline (except missing live baseline recovery).
- One `generateLiveInsight` per pipeline tick; shared `context_hash` dedup + `withLiveInsightLock`.
- Live prediction persisted when LLM fails.

---

## 2. Event / update strategy (after change)

| Trigger                     | Threshold / rule                                                                           | LLM |
| --------------------------- | ------------------------------------------------------------------------------------------ | --- |
| GOAL, RED_CARD, PENALTY     | New provider events (or score fallback)                                                    | Yes |
| VAR_DECISION                | Var event; goal disallowed/cancelled, card upgrade, penalty revoked (not penalty-only VAR) | Yes |
| XG_DELTA                    | Max team xG Δ ≥ **0.5**; both snapshots must have xG                                       | Yes |
| PROBABILITY_SHIFT           | Any outcome Δ ≥ **10pp** vs anchor preview                                                 | Yes |
| HT                          | Status edge into `HT`                                                                      | Yes |
| FT / AET / PEN              | Live status → finished (`FT`, `AET`, `PEN`)                                                | Yes |
| MATCH_STATE                 | Other documented phase changes (`1H`↔`2H`, `ET`, `P`, etc.)                                | Yes |
| LIVE_BASELINE               | No live insight row yet                                                                    | Yes |
| PERIODIC                    | ≥ **25 min** since last insight + material score/xG/prob change                            | Yes |
| SIGNIFICANT_SUBSTITUTION    | Starter off before minute **70** (PRD §7.7)                                                | Yes |
| Unchanged poll              | `ingest.changed === false`                                                                 | No  |
| Small xG / small prob shift | Below thresholds above                                                                     | No  |

**Cost control**

- [live-insight-generation-gate.ts](../lib/live/live-insight-generation-gate.ts): Redis + in-memory **processed event keys** per fixture (TTL `LIVE_INSIGHT_SCHEDULE_TTL_SEC`); skip LLM when all dedupe keys already processed (`EVENTS_ALREADY_PROCESSED`).
- **Soft min interval 45s** for triggers that are **only** `PERIODIC` and/or `PROBABILITY_SHIFT` (`SOFT_MIN_INTERVAL`); discrete events (goals, cards, FT, etc.) are not throttled.
- Existing: failure backoff 120s, periodic floor 25 min, `context_hash` cache, pipeline without `userId` (shared generation for all viewers).
- Gate runs **after** `updateLiveProbability`, **before** LLM — probabilities update even when gate or LLM skips.

---

## 3. AI reasoning input

Live context ([buildLiveContext](../lib/services/aiContextService.ts)) now includes:

- **prematchReference** — pre-kickoff expectation (unchanged).
- **prediction** — current live model output (same row as persisted LIVE prediction).
- **predictionBinding** — `{ predictionId, liveSnapshotId }` tied to that row.
- **latestMatchEvents** — up to 8 new events this tick (from snapshot diff).
- **meaningfulTriggers** — kinds that fired this tick.

`context_hash` includes `predictionId`, `liveSnapshotId`, sorted `triggerEventIds` (external event ids from `latestMatchEvents`), plus existing live fields ([context-hash-input.ts](../lib/ai/context-hash-input.ts)).

Prompt rules updated in [prompts.ts](../lib/ai/prompts.ts): no invented incidents outside `latestMatchEvents` / triggers.

---

## 4. Failure isolation

| Failure          | Match page / live probs                     | AI                                                                        |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| LLM error        | Latest LIVE row from delta API              | `liveInsightGenerated: false`; prior insight via GET if any               |
| Gate skip        | Prediction still updated on meaningful tick | Skip reason `EVENTS_ALREADY_PROCESSED` / `SOFT_MIN_INTERVAL` (no backoff) |
| No live baseline | No LIVE row                                 | `NO_LIVE_BASELINE`; no LLM                                                |

`readLiveInsight` sets optional **`predictionStale`** when stored insight `prediction_id` ≠ latest LIVE row (delta remains authoritative for displayed probabilities).

---

## 5. Changes (files)

| Area            | Files                                                                                                                                                                                                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Detection       | [event-detector-types.ts](../lib/live/event-detector-types.ts), [eventDetector.ts](../lib/live/eventDetector.ts), [meaningful-event-labels.ts](../lib/live/meaningful-event-labels.ts)                                                                                                                                                          |
| Pipeline + gate | [meaningful-event-pipeline.ts](../lib/live/meaningful-event-pipeline.ts), [live-insight-generation-gate.ts](../lib/live/live-insight-generation-gate.ts), [redis/keys.ts](../lib/redis/keys.ts)                                                                                                                                                 |
| Context / hash  | [aiContextService.ts](../lib/services/aiContextService.ts), [types/ai.ts](../types/ai.ts), [context-hash-input.ts](../lib/ai/context-hash-input.ts), [prompts.ts](../lib/ai/prompts.ts)                                                                                                                                                         |
| API / types     | [aiService.ts](../lib/services/aiService.ts), [schemas.ts](../lib/ai/schemas.ts), [predictions/db.ts](../lib/predictions/db.ts), [types/prediction.ts](../types/prediction.ts), [live-probability-delta](../lib/live/live-probability-delta.ts), [live-probability-delta route](../app/api/matches/[fixtureId]/live-probability-delta/route.ts) |
| Tests           | `eventDetector.test.ts`, `meaningful-event-pipeline.test.ts`, `live-insight-generation-gate.test.ts`, `probability-shift.test.ts`, `live-snapshot-alignment.test.ts`, `aiContextService.test.ts`                                                                                                                                                |

**Database:** no migration.

---

## 6. Tests

| Scenario                                                                                 | File                                            |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Goal / equalizer / red / penalty / VAR / FT / HT                                         | `lib/live/eventDetector.test.ts`                |
| Small xG no trigger                                                                      | `eventDetector.test.ts`                         |
| Pipeline: no-op, baseline, goal, burst → one LLM, AI fail + pred ok, event dedup, HT, FT | `lib/live/meaningful-event-pipeline.test.ts`    |
| Gate dedup + soft interval                                                               | `lib/live/live-insight-generation-gate.test.ts` |
| Prob shift threshold                                                                     | `lib/live/probability-shift.test.ts`            |
| Snapshot id alignment                                                                    | `lib/ai/live-snapshot-alignment.test.ts`        |

---

## 7. Verification

| Command                 | Result (2026-10-11)                  |
| ----------------------- | ------------------------------------ |
| `npm.cmd run test:ci`   | **830 passed** (196 files)           |
| `npm.cmd run typecheck` | Passed                               |
| `npm.cmd run lint`      | 0 errors, 13 warnings (pre-existing) |

---

## 8. API and LLM cost implications

- **Fewer duplicate LLM calls** when the same provider event ids are replayed (Redis processed set).
- **Soft 45s floor** on periodic/shift-only refreshes reduces shift jitter spam; goals/cards/FT unchanged.
- **Shared pipeline generation** (no per-viewer LLM on poll) unchanged — one generation per distinct `context_hash` per fixture state.
- **Extra context tokens** from `latestMatchEvents` (capped at 8) — small increase per live generation.

---

## 9. Remaining edge cases

- **Post-FT live GET:** `readLiveInsight` returns `NOT_LIVE` after FT; last live narrative is in DB but not served on live endpoint (historical/prematch paths only).
- **Events without `externalEventId`:** treated as new each tick; gate may not dedupe — composite keys not added in this pass.
- **INT/SUSP:** live AI generation blocked via fixture status; polling may continue at reduced cadence.
- **`predictionStale`:** narrative can lag newest LIVE row after LLM failure while delta shows fresh probabilities (by design).

---

## 10. Assumptions

1. **Snapshot id (5.2):** `liveSnapshotId = computeLiveSnapshotIdentity(LIVE input_snapshot)`; exposed on `LivePredictionResult`, delta `livePrediction`, and AI `predictionBinding`.
2. **Major VAR:** heuristic string match on API-Football Var `detail`/`comments` (documented in `isMajorVarEvent`).
3. **Europe/Belgrade:** unchanged — lifecycle display only; storage UTC.
4. **05-x audit docs:** absent; binding documented in 06-1 and this report.
