# Audit 05-2 — P0 live probability correctness

**Date:** 2026-10-11  
**Prerequisites:** [04-1-prematch-prediction.md](./04-1-prematch-prediction.md), [05-1-live-state.md](./05-1-live-state.md)

---

## 1. Root cause

**Primary:** The API and UI treated the **latest `predictions` LIVE row** as current without verifying that `input_snapshot` matched the **authoritative fixture score/minute**. When live polling did not run (or lagged), the stored row could still reflect an early match state (e.g. 0:0 @15') while the UI scoreboard showed 2:0 @75'. Pre-match anchor probabilities (~93% home favorite) then appeared as “live” win chances for the wrong side/outcome.

**Secondary:** [AIHeroCard](../components/ai/AIHeroCard.tsx) rendered probabilities from the **live insight’s linked prediction** (`insightMode === "live"`) instead of the validated delta live bar, so stale narrative-bound rows could display even when a fresher delta existed.

**Not the root cause:** [scoreLiveFromFeatures](../lib/models/liveProbability.ts) — regression tests show 2:0 @75' with balanced anchor yields high home probability ([liveProbability.test.ts](../lib/models/liveProbability.test.ts)).

---

## 2. Data-flow trace

| Step | Component                                                                                                            | Failure mode addressed                                         |
| ---- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1    | API-Football live fixture                                                                                            | —                                                              |
| 2    | [ingest-live-tick.ts](../lib/live/ingest-live-tick.ts)                                                               | Polling off → no new LIVE rows                                 |
| 3    | Postgres `fixtures` / `predictions`                                                                                  | Stale LIVE row remains “latest”                                |
| 4    | [buildLiveDetectorSnapshot](../lib/live/detector-snapshot.ts)                                                        | Used for recompute when enabled                                |
| 5    | [buildLiveFeaturesFromSnapshot](../lib/models/live-features.ts)                                                      | Score home/away from snapshot                                  |
| 6    | [scoreLiveFromFeatures](../lib/models/liveProbability.ts)                                                            | Model OK if inputs OK                                          |
| 7    | [updateLiveProbability](../lib/services/predictionService.ts)                                                        | Structured diagnostic log added                                |
| 8    | [resolveLiveProbabilityDelta](../lib/live/resolve-live-probability-delta.ts)                                         | **Validates** row vs fixture; optional recompute               |
| 9    | [live-probability-delta route](../app/api/matches/[fixtureId]/live-probability-delta/route.ts)                       | Returns `liveAvailable`, `unavailableReason`, `sourceSnapshot` |
| 10   | React Query `liveKeys.probabilityDelta`                                                                              | Client refetch unchanged                                       |
| 11   | [resolveLivePhaseViewModel](../lib/ai/live-insight-state.ts)                                                         | Clears `liveWinProbabilities` when unavailable                 |
| 12   | [AIHeroCard](../components/ai/AIHeroCard.tsx) / [OverviewAiEngineCard](../components/match/OverviewAiEngineCard.tsx) | Prefer validated live bar                                      |

---

## 3. Code changes

| File                                                                               | Purpose                                                                                      |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [live-prediction-validation.ts](../lib/predictions/live-prediction-validation.ts)  | Snapshot vs fixture validation; `LivePredictionUnavailableReason`; `sourceSnapshot` identity |
| [resolve-live-probability-delta.ts](../lib/live/resolve-live-probability-delta.ts) | Central read path: validate, recompute if polling on, never expose mismatched live           |
| [live-probability-delta.ts](../lib/live/live-probability-delta.ts)                 | Extended response type                                                                       |
| [db.ts](../lib/predictions/db.ts)                                                  | `resolveLiveFixtureStateByExternalId`                                                        |
| [predictionService.ts](../lib/services/predictionService.ts)                       | JSON log on live compute                                                                     |
| [live-insight-state.ts](../lib/ai/live-insight-state.ts)                           | Unavailable live + `predictionStale` → no stale prediction on hero                           |
| [AIHeroCard.tsx](../components/ai/AIHeroCard.tsx)                                  | Live mode bar uses `liveWinProbabilities`                                                    |
| [OverviewAiEngineCard.tsx](../components/match/OverviewAiEngineCard.tsx)           | Live insight stripe uses validated delta only                                                |

No probability clamps or outcome floors added.

---

## 4. Regression tests

| Case                                               | File                                                                                         |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 2:0 @75' vs stored 0:0 @15' → `SCORE_MISMATCH`     | [live-prediction-validation.test.ts](../lib/predictions/live-prediction-validation.test.ts)  |
| Delta resolver hides stale live                    | [resolve-live-probability-delta.test.ts](../lib/live/resolve-live-probability-delta.test.ts) |
| View model clears live when `liveAvailable: false` | [live-insight-state.test.ts](../lib/ai/live-insight-state.test.ts)                           |
| Model 2:0 / 0:2 / anchor separation                | [liveProbability.test.ts](../lib/models/liveProbability.test.ts)                             |

---

## 5. Before / after behavior

| Situation                         | Before                              | After                                                                                         |
| --------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| LIVE row stale vs scoreboard      | Delta API returned stale probs      | `live: null`, `liveAvailable: false`, reason e.g. `SCORE_MISMATCH` or `LIVE_POLLING_DISABLED` |
| Live insight OK, prediction stale | Hero showed linked prediction probs | Hero uses validated `liveWinProbabilities`; stale insight prediction cleared when flagged     |
| Polling enabled + valid detector  | Same                                | May recompute LIVE row on read, then expose aligned probs + `sourceSnapshot`                  |
| Finished match                    | Latest live row for delta           | Still shown (historical delta); validation relaxed for non-live status                        |

---

## 6. Remaining edge cases

- Recompute-on-read requires Redis detector snapshot + `LIVE_POLLING_ENABLED`; otherwise user sees unavailable until next pipeline tick.
- `SCORE_UNAVAILABLE` when provider leaves null scores during live — intentional (no invented 0:0).
- LLM narrative may lag latest LIVE row (`predictionStale`); probabilities authoritative via delta only.
- Home/away swap in provider data: guarded by fixture id + score equality checks; reversed fixture IDs in snapshot fail `FIXTURE_ID_MISMATCH`.

---

## 7. Verification

| Command                 | Result                     |
| ----------------------- | -------------------------- |
| `npm.cmd run typecheck` | Passed                     |
| `npm.cmd run test:ci`   | **836 passed** (198 files) |

---

## Assumptions

1. Official prematch anchor unchanged (RC-12).
2. `liveSnapshotId` / context hash from [context-hash-input.ts](../lib/ai/context-hash-input.ts) remains binding for AI when generation runs.
3. Showing unavailable live is preferable to showing mismatched probabilities.
