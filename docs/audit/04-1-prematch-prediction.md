# Audit 04-1 — Pre-match prediction lifecycle

**Date:** 2026-10-10  
**Prerequisite:** [03-2-readiness-model.md](./03-2-readiness-model.md)

---

## 1. Audit findings (pre-change)

### Data flow

Fixture row (`fixtures` home/away/league/kickoff UTC) → PIT analytics → [`buildPrematchFeatures`](../lib/models/features.ts) → logistic + Poisson → [`scorePrematchFromFeatures`](../lib/models/features.ts) → [`insertPrematchPrediction`](../lib/predictions/db.ts) (`predictions.type = PREMATCH`, `input_snapshot` JSON).

**Read paths:**

| Path                | Entry                                                                                                                                                                                                                                                                   | Gates                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Compute / cache     | [`getOrComputePrematch`](../lib/services/predictionService.ts)                                                                                                                                                                                                          | 72h window, readiness, freshness 6h, feature fingerprint, generic baseline rejection when signal exists |
| Latest / historical | [`getLatestPrematch`](../lib/services/predictionService.ts)                                                                                                                                                                                                             | Previously **no** validation                                                                            |
| Official anchor     | [`getOfficialPrematch`](../lib/services/predictionService.ts) / `created_at < kickoff_at`                                                                                                                                                                               | Used for live anchor (RC-12)                                                                            |
| Consumers           | [`readPrematchInsight`](../lib/services/aiService.ts), [`live-probability-delta`](../app/api/matches/[fixtureId]/live-probability-delta/route.ts), [`top-picks`](../lib/predictions/top-picks.ts), UI via [`AIInsightProvider`](../components/ai/AIInsightProvider.tsx) | Mixed                                                                                                   |

### Root causes

| ID    | Issue                                                                          | Location                                                                                                                                  |
| ----- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| PP-01 | Stored corrupt probabilities **re-normalized** on read instead of unavailable  | [`mapPredictionRowToResult`](../lib/predictions/db.ts) + [`normalizeWinProbabilitiesWithFloor`](../lib/models/normalize-probabilities.ts) |
| PP-02 | Missing xG columns coerced to **0** for display and Poisson recompute          | `resolveGoalMarketsFromRow`                                                                                                               |
| PP-03 | `input_snapshot` identity not checked on read (fixture / home / away / league) | All `mapPredictionRowToResult` callers                                                                                                    |
| PP-04 | Feature fingerprint omitted fixture + team + league IDs                        | [`prematch-feature-fingerprint.ts`](../lib/models/prematch-feature-fingerprint.ts)                                                        |
| PP-05 | Generic intercept-only baseline indistinguishable on stored rows               | Model always persists; UI partially gated via [`isFixtureSpecificPrematchModel`](../lib/ai/prematch-availability.ts)                      |
| PP-06 | Confidence from max outcome only; **PARTIAL** data could show HIGH             | [`bucketConfidence`](../lib/models/confidence.ts)                                                                                         |
| PP-07 | Post-kickoff **fallback** to latest PREMATCH when official missing             | `readPrematchRowForFixture`, delta API, live AI context                                                                                   |
| PP-08 | PREMATCH vs LIVE probabilities conflated at API boundary                       | DB enum `PREMATCH` \| `LIVE` only                                                                                                         |

FR-01–FR-04 were fixed in audit 03-2; this task addresses FR-05–FR-07 and PP-* above.

---

## 2. Architecture after changes

### Validation layer

New [`lib/predictions/prematch-validation.ts`](../lib/predictions/prematch-validation.ts):

- Raw win probability checks (range + sum tolerance) **before** floor normalization
- Snapshot identity vs fixture (`fixtureExternalId`, `homeTeamProviderId`, `awayTeamProviderId`, `leagueProviderId`)
- xG: reject negative; **missing** components → `expectedGoalsAvailable: false` (no 0+0 Poisson fabrication unless stored market probs exist)
- `modelTier`: `GENERIC_BASELINE` \| `FIXTURE_SPECIFIC`
- `capConfidenceByDataQuality` (PARTIAL → max MEDIUM; generic / no signal → LOW)

### Mapping

- [`mapPredictionRowToResult`](../lib/predictions/db.ts) requires [`FixtureSnapshotIdentity`](../lib/predictions/prematch-validation.ts); returns **`null`** when invalid
- [`mapPrematchPredictionRowForFixture`](../lib/predictions/db.ts) loads identity from DB
- [`loadFixtureSnapshotIdentity`](../lib/predictions/db.ts) for fixture-scoped reads

### Persistence / service

- [`computeAndPersistPrematch`](../lib/services/predictionService.ts): [`validatePrematchModelOutput`](../lib/predictions/prematch-validation.ts) before insert
- Post-kickoff reads: **official row only** (no latest PREMATCH fallback)
- Fingerprint includes fixture + team + league IDs

### Presentation types (live scoring fix deferred)

[`types/probability-presentation.ts`](../types/probability-presentation.ts):

- `PRE_MATCH_PROBABILITY`, `LIVE_PROBABILITY`, `POST_MATCH_RESULT` (result stub)
- `PrematchPredictionResult.presentationKind`, `LivePredictionResult.presentationKind`
- Delta API exposes `prematchKind` / `liveKind`

### Generic baseline

- Stored with `modelTier: GENERIC_BASELINE`
- Excluded from top picks; UI continues to use [`resolvePrematchDisplayExperience`](../lib/ai/prematch-availability.ts) + `modelTier`

---

## 3. Files changed (summary)

| Area         | Files                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Validation   | `lib/predictions/prematch-validation.ts`, `.test.ts`                                                                                    |
| Types        | `types/prediction.ts`, `types/probability-presentation.ts`, `.test.ts`                                                                  |
| DB / map     | `lib/predictions/db.ts`                                                                                                                 |
| Model        | `lib/models/features.ts`, `lib/models/prematch-feature-fingerprint.ts`                                                                  |
| Service      | `lib/services/predictionService.ts`                                                                                                     |
| API          | `app/api/matches/[fixtureId]/live-probability-delta/route.ts`, `lib/live/live-probability-delta.ts`                                     |
| Consumers    | `top-picks.ts`, `aiContextService.ts`, `live-insight-display.ts`, `readiness/persist.ts`, `record-evaluation.ts`, `landing-showcase.ts` |
| Availability | `lib/ai/prematch-availability.ts`                                                                                                       |

**Database:** no migration (fingerprint computed on read; legacy rows invalidate via fingerprint drift until recompute inside 72h window).

---

## 4. Tests

| Scenario                               | File                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Fixture / home-away / league mismatch  | `lib/predictions/prematch-validation.test.ts`                             |
| Invalid probabilities                  | `prematch-validation.test.ts`                                             |
| Missing xG                             | `prematch-validation.test.ts`                                             |
| Generic baseline tier + confidence cap | `prematch-validation.test.ts`                                             |
| Fingerprint identity fields            | `lib/models/prematch-feature-fingerprint.test.ts`                         |
| Presentation kind separation           | `types/probability-presentation.test.ts`                                  |
| FR-01–FR-03 regression                 | `lib/services/predictionService.test.ts`                                  |
| Display / narrative eligibility        | `prematch-availability.test.ts`, `prematch-narrative-eligibility.test.ts` |

---

## 5. Verification

| Command                 | Result                               |
| ----------------------- | ------------------------------------ |
| `npm.cmd run typecheck` | Passed                               |
| `npm.cmd run lint`      | 0 errors, 14 warnings (pre-existing) |
| `npm.cmd run test:ci`   | **787 passed** (187 files)           |

---

## 6. Remaining limitations

- Live probability **scoring** unchanged ([`liveProbability.ts`](../lib/models/liveProbability.ts) — separate task).
- Live row mapping still uses legacy goal-market resolution for LIVE type.
- Model version not in fingerprint (RC-09): old probabilities may display under new version label until recompute.
- Legacy PREMATCH rows with stale fingerprints recompute when inside 72h window; outside window `getOrComputePrematch` returns null rather than unvalidated data.
- `POST_MATCH_RESULT` type is defined; product UI for final score as a dedicated bundle not wired yet.
- Match page form/H2H still non-PIT in places (audit 02-2).

---

## 7. Assumptions

1. Extending the feature fingerprint invalidates cached rows until recomputed — acceptable.
2. Belgrade lifecycle / readiness gates from 03-2 remain authoritative for compute eligibility.
3. Official prematch only post-kickoff is correct for anchor and historical display (RC-12).
4. Top picks must exclude `GENERIC_BASELINE` entirely.
5. Floor normalization remains a **display** step only after raw DB values pass validation.
