# Audit 03-1 — Fixture lifecycle & data readiness matrix

**Date:** 2026-10-07  
**Scope:** Read-only trace of production data flow from code. No application code changed in this task.  
**Prerequisites:** [00-architecture-map.md](./00-architecture-map.md), [01-2-fixture-ingestion.md](./01-2-fixture-ingestion.md), [02-1-history-storage.md](./02-1-history-storage.md), [02-2-features-ai-context.md](./02-2-features-ai-context.md)

**Verification (baseline, no code changes):**

| Command                 | Result                               |
| ----------------------- | ------------------------------------ |
| `npm.cmd run typecheck` | Passed                               |
| `npm.cmd run lint`      | 0 errors, 13 warnings (pre-existing) |
| `npm.cmd run test:ci`   | 751 passed (182 files)               |

---

## 1. Lifecycle map (intended vs code)

There is **no single lifecycle enum** in the product. Stage is **derived** from `fixtures.status`, timestamps, and side tables. The table below maps the audit lifecycle to explicit vs implied representation and primary writers/readers.

| Lifecycle stage      | Explicit representation                                                                                                                                      | Implied / derived                                                                                                          | Primary writers                                                                                  | Primary readers                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **UPCOMING**         | `fixtures.status` ∈ `NS`, `TBD`; row in `fixtures`                                                                                                           | Listed in fixtures window / dashboard “upcoming” by **UTC date key** on `kickoff_at`                                       | `sync-fixtures-future`, `sync-fixtures`, `sync-fixtures-today`, on-demand upsert                 | `footballService`, fixtures UI (`groupFixturesByDayAndLeague` UTC or viewer TZ split)                                      |
| **PRE-MATCH DATA**   | Partial: `fixtures.match_ingestion_state` (post-terminal deps only), `fixtures.prematch_readiness`, child rows (`lineups`, `fixture_sidelined`, `standings`) | “Has lineups / injuries / standings” inferred from row counts, not exposed on API                                          | `sync-lineups`, `ingest-sidelined`, `sync-standings`, `repair-team-history`, `refresh-analytics` | `buildPrematchFeatures`, `buildFixtureHistoryFeatures`, `buildPrematchContext`                                             |
| **PREDICTION READY** | `predictions` row `type = PREMATCH`; `input_snapshot` (feature vector + `dataQuality`)                                                                       | “Fixture-specific” vs baseline via `isFixtureSpecificPrematchModel`; compute window via `PREMATCH_SCHEDULED_LEAD_MS` (72h) | `predictionService.getOrComputePrematch`                                                         | Match AI card (via prematch insight API), `top-picks`, entitlements                                                        |
| **AI READY**         | `ai_insights` `type = PREMATCH` keyed by `context_hash`; Redis prematch cache                                                                                | Prematch narrative tier from `resolvePrematchDisplayExperience`                                                            | `aiService.generatePrematchInsight`, cron `warm-ai-prematch`                                     | `AIInsightProvider`, `readPrematchInsight`                                                                                 |
| **LIVE**             | `fixtures.status` live set; `fixtures.is_live` generated column; `last_provider_sync_at` / live clock columns                                                | UI “authoritative live” via `isAuthoritativeLivePresentation`                                                              | `ingest-live-center-tick`, internal poll ticks, `sync-fixtures-today`                            | Live center, match `MatchLiveSession`, `readLiveInsight`                                                                   |
| **LIVE UPDATES**     | `predictions` `type = LIVE`; `ai_insights` `type = LIVE`; detector snapshot in Redis                                                                         | Refresh cadence: `LIVE_INSIGHT_PERIODIC_REFRESH_MS`, event-driven schedule                                                 | `updateLiveProbability`, live insight generator                                                  | Live match UI, `live-probability-delta`                                                                                    |
| **FINISHED**         | `fixtures.status` ∈ `FT`, `AET`, `PEN`; terminal scores on row                                                                                               | Phase `FINISHED` in `resolveFixturePhase`                                                                                  | Provider upsert, reconcile finalize                                                              | Historical prematch read path, match tabs                                                                                  |
| **POST-MATCH**       | `match_ingestion_state.dependencies.*` for events/statistics/lineups/performances                                                                            | `evaluateFixtureDependencyCompleteness` (cron only)                                                                        | `sync-match-details`, inline on `sync-fixtures`                                                  | Not surfaced on match UI; ops/cron                                                                                         |
| **HISTORICAL**       | Completed `fixtures` rows; optional `ingestion_team_sync_state.history_state`                                                                                | PIT queries `kickoff_at < beforeAt`; completeness `DATA_*` in team-history layer                                           | Backfill/repair crons, daily fixture sync                                                        | Model features, **prematch** AI context (`buildFixtureHistoryFeatures`); UI form/H2H still uses non-PIT `analyticsService` |

### Cross-layer inconsistencies (status / “live”)

| Layer                                     | Live status set                                | Notes                                               |
| ----------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| `lib/ai/status-map.ts` `LIVE_STATUSES`    | Includes `INT`, `SUSP`, `LIVE`, periods        | Drives AI phase (`PREMATCH` / `LIVE` / `FINISHED`)  |
| `lib/redis/keys.ts` `isLiveFixtureStatus` | `LIVE`, `1H`, `HT`, `2H`, `ET`, `BT`, `P` only | Match page SSR snapshot, live lists, reconcile      |
| DB `fixtures.is_live` generated           | `1H`, `HT`, `2H`, `ET`, `BT`, `P`, `LIVE`      | Partial index for live queries; **no** `INT`/`SUSP` |
| `sync-fixtures-today` priority set        | Subset (no `SUSP`)                             | Intraday ingest ordering                            |

**Effect:** A fixture in `INT` or `SUSP` is **LIVE for AI** but may **not** poll or show as live in Live Center / match live session (guest delta path still uses phase from status prop).

### Cross-layer inconsistencies (readiness flags)

| Field                                                                  | Written by                          | Read by product UI/API?                                      |
| ---------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| `fixtures.prematch_readiness` (`aiEligible`, `reasons`, `evaluatedAt`) | `sync-fixtures-today` batch refresh | **No** — only `warm-ai-prematch` sort priority + ops scripts |
| `fixtures.match_ingestion_state`                                       | Match-details / lineups ingest      | **No** — cron/completeness only                              |

**Effect:** Operators can see eligibility in DB; users see **derived** tiers (`scheduled`, `model_only`, etc.) with **no** link to `prematch_readiness` or dependency state.

---

## 2. Readiness matrix

Legend for **classification** (per data item, per stage):

- **R** — Required for stage to be “ready” in product logic
- **O** — Optional / enriches but not gating
- **U** — Unavailable by design (not in product)
- **NY** — Not yet available (expected empty pre-window)
- **S** — May exist but stale vs current inputs
- **I** — Insufficient depth (partial signal; may still produce output)

| Data item                   | UPCOMING               | PRE-MATCH DATA              | PREDICTION READY                               | AI READY                                      | LIVE                                                 | LIVE UPDATES | FINISHED                     | POST-MATCH                  | HISTORICAL            |
| --------------------------- | ---------------------- | --------------------------- | ---------------------------------------------- | --------------------------------------------- | ---------------------------------------------------- | ------------ | ---------------------------- | --------------------------- | --------------------- |
| Fixture metadata            | R (row)                | R                           | R                                              | R                                             | R                                                    | R            | R                            | R                           | R                     |
| Teams / league / season     | R (FKs)                | R                           | R                                              | R                                             | R                                                    | R            | R                            | R                           | R                     |
| Standings                   | NY/O                   | O (daily `sync-standings`)  | O (ranks in model)                             | O (context)                                   | O                                                    | —            | O                            | —                           | O                     |
| Recent form                 | NY                     | R (DB history → features)   | R (≥3 matches → `PARTIAL`; model signal rules) | R (PIT compact context)                       | I (live context uses **non-PIT** `analyticsService`) | —            | I (UI aggregates non-PIT)    | —                           | R (PIT history layer) |
| Historical data (30+ depth) | NY                     | I/O (`repair-team-history`) | I (model uses last 5/10 primarily)             | O (windows + completeness in compact context) | —                                                    | —            | —                            | —                           | R for analytics       |
| H2H                         | NY                     | O                           | O (signal if rates present)                    | O (isolated H2H features)                     | O (non-PIT in live context)                          | —            | O                            | —                           | R                     |
| Odds                        | U                      | U                           | U                                              | U                                             | U                                                    | U            | U                            | U                           | U                     |
| Injuries / sidelined        | NY                     | O (`ingest-sidelined`)      | O (injury impact features)                     | O                                             | O                                                    | —            | O                            | —                           | —                     |
| Lineups                     | NY (until ~90m window) | O (`sync-lineups`, 90m)     | O (feature state MISSING/PREDICTED/CONFIRMED)  | O (context)                                   | O                                                    | —            | O (expected post-FT)         | R (if competition supports) | —                     |
| Referee / venue             | O                      | O (on fixture row)          | —                                              | O (manifest)                                  | O                                                    | —            | O                            | —                           | —                     |
| Events                      | NY                     | NY                          | —                                              | —                                             | R (live UX)                                          | R            | R                            | R                           | R                     |
| Statistics                  | NY                     | NY                          | O (xG in model if samples)                     | O (xG in history windows)                     | R                                                    | R            | R                            | R                           | R                     |
| Prediction (PREMATCH)       | NY (>72h may hide)     | I                           | R                                              | R (input to LLM)                              | S (frozen official preferred)                        | —            | S                            | —                           | —                     |
| AI context                  | NY                     | I                           | R (built on demand)                            | R (hash match)                                | I (live build path)                                  | I            | S (historical row frozen)    | —                           | —                     |
| AI insight                  | NY                     | NY                          | NY (36h LLM window)                            | R                                             | O (LIVE type)                                        | R            | S (historical PREMATCH only) | —                           | —                     |
| Post-match bundle           | NY                     | NY                          | —                                              | —                                             | —                                                    | —            | I                            | R (`match_ingestion_state`) | R                     |

---

## 3. False readiness bugs

Severity: **Critical** — user-visible wrong probabilities/narrative or post-kickoff “prematch” treated as official; **High** — stale or incomplete data presented as current; **Medium** — inconsistent phase/labels; **Low** — ops/edge.

| ID    | Severity     | Symptom                                                                                                         | Mechanism                                                                                                                                                                                                            | File references                                                                                          |
| ----- | ------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| FR-01 | **High**     | Prediction shown **>72h** before kickoff without freshness/fingerprint                                          | `getOrComputePrematch` returns **any** latest row when outside `PREMATCH_SCHEDULED_LEAD_MS` with `cached: true`, no age check                                                                                        | `lib/services/predictionService.ts` (~258–268)                                                           |
| FR-02 | **High**     | Stale prediction treated fresh when recomputing features fails                                                  | `storedPredictionMatchesCurrentFeatures` returns **`true` if `buildPrematchFeatures` returns null**                                                                                                                  | `lib/services/predictionService.ts` (~80–88)                                                             |
| FR-03 | **Critical** | **Post-kickoff PREMATCH row** created on visit; may be shown as historical “prematch”                           | After kickoff, `getOrComputePrematch` → `computeAndPersistPrematch` inserts new PREMATCH if no official row; historical insight path uses `readLatestPrematchInsight` + `getLatestPrematch` / `getOrComputePrematch` | `lib/services/predictionService.ts` (~103–122, 233–255); `lib/services/aiService.ts` (~306–328, 118–147) |
| FR-04 | **High**     | Historical prematch **narrative** shown though **context_hash** no longer matches inputs                        | Live/finished: `historicalPrematchWriteAction` → `return_stored` without hash validation; prematch phase uses hash only for cache hit                                                                                | `lib/ai/status-map.ts` (~62–79); `lib/services/aiService.ts` (~306–328, 240–241)                         |
| FR-05 | **Medium**   | `dataQuality: COMPLETE` with thin form                                                                          | `buildPrematchFeatures` sets COMPLETE when both teams have ≥3 matches and xG optional (`hasXg \|\| samples === 0`)                                                                                                   | `lib/models/features.ts` (~222–229)                                                                      |
| FR-06 | **Medium**   | Missing Elo treated as **default rating** (1500-class), not explicit unavailable                                | `eloHome`/`eloAway` fall back to `DEFAULT_MODEL_COEFFICIENTS.elo.defaultRating`                                                                                                                                      | `lib/models/features.ts` (~117–122)                                                                      |
| FR-07 | **Medium**   | Missing xG in DB read path coerced to **0** for goal markets                                                    | `resolveGoalMarketsFromRow` uses `Number(row.expected_goals_home ?? 0)`                                                                                                                                              | `lib/predictions/db.ts` (~70–75)                                                                         |
| FR-08 | **High**     | **Warm cron** can run LLM on fixtures **without** enforcing `prematch_readiness.aiEligible`                     | Candidates sorted by eligibility but **not filtered**; `generatePrematchInsight` does not read readiness                                                                                                             | `lib/ingestion/warm-ai-prematch.ts` (~41–78, 118–120); `lib/services/aiService.ts`                       |
| FR-09 | **Medium**   | `prematch_readiness` updated only for fixtures **upserted in today’s cron batch**, not full upcoming window     | Readiness refresh tied to `domainFixtures` from today sync only                                                                                                                                                      | `lib/ingestion/sync-fixtures-today.ts` (~145–149)                                                        |
| FR-10 | **Medium**   | Live Center “AI updated” badge can imply fresh AI when insight is **up to 15m old**                             | Marker uses `readRecentLiveInsightTimestamps` (15m window) but UI freshness constant **5m**                                                                                                                          | `lib/ai/db.ts` (~33–34); `lib/live/ai-updated-marker.ts`                                                 |
| FR-11 | **Medium**   | Stale DB **live** status still “live” in AI phase while UI hides via presentation layer                         | `resolveFixturePhase` vs `isAuthoritativeLivePresentation` / `resolvePresentationFixture`                                                                                                                            | `lib/ai/status-map.ts`; `lib/live/live-presentation.ts`                                                  |
| FR-12 | **Low**      | `formatScore` displays `null` scores as **0-0** during reconcile logging/paths                                  | `score.home ?? 0`                                                                                                                                                                                                    | `lib/live/reconcile-stale-live.ts` (~43–44)                                                              |
| FR-13 | **Medium**   | Match UI **form/H2H** can include matches **after** kickoff (non-PIT) for finished fixtures                     | `analyticsService.getRecentForm` / `getH2H` without `beforeAt` on overview paths                                                                                                                                     | `docs/audit/02-2-features-ai-context.md`; `lib/services/analyticsService.ts`                             |
| FR-14 | **Low**      | `match_ingestion_state` / dependency completeness **not** exposed — UI cannot distinguish NY vs missing post-FT | State persisted but no read API                                                                                                                                                                                      | `lib/ingestion/ingestion-result.ts`; match panels via `footballService` only                             |

---

## 4. Race conditions & ordering hazards

| ID    | Sequence                                                                                                                       | Risk                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| RC-01 | Future fixture upserted → user opens match → `getOrComputePrematch` before `repair-team-history` / backfill fills 30+ rows     | Early **PARTIAL** prediction persisted; may remain until fingerprint/freshness invalidates                                                         |
| RC-02 | `sync-fixtures-today` upsert → **immediate** `refreshPrematchReadinessBatch` while team history still **DATA_INSUFFICIENT**    | `aiEligible: false` in DB but user request can still compute prediction if signal thresholds met                                                   |
| RC-03 | `warm-ai-prematch` (15m GHA) runs parallel to lineups cron (90m window)                                                        | LLM context built **before** lineups confirmed → insight stored under old `context_hash`; lineups update does not auto-invalidate prematch insight |
| RC-04 | User auto-ensure (`AIInsightProvider` POST) fires on `MISS` + `shouldAutoGenerateNarrative` while GET still loading prediction | Duplicate generation attempts mitigated by lock, but **first** prediction row may be baseline/generic before form refresh                          |
| RC-05 | `getOrComputePrematch` succeeds → `buildPrematchContext` **throws** if `buildFixtureHistoryFeatures` null (missing FK teams)   | User sees prediction path OK in some flows but generation returns FALLBACK/UNAVAILABLE — inconsistent “ready”                                      |
| RC-06 | Live poll + `sync-match-details` + live ingest concurrent on same fixture                                                      | Mitigated by match-details Redis lock; live tail can still race statistics partial writes (documented in 01-2)                                     |
| RC-07 | Kickoff passes → status still `NS` briefly → prematch compute window open → new PREMATCH insert **after** kickoff              | Contributes to FR-03 official snapshot pollution                                                                                                   |
| RC-08 | `refresh-analytics` (03:00 UTC) vs user traffic before form snapshots warm                                                     | Model uses PIT DB reads, not snapshots, but UI form cards may lag                                                                                  |
| RC-09 | Active model version changes → old predictions remain; fingerprint may not include model version                               | Latest row returned with new `mapPredictionRowToResult` version label but old probabilities                                                        |

---

## 5. Freshness model (as implemented)

| Artifact                    | Timestamp field                           | Freshness window (code)                                                                                             | Stale-but-current risk                                                                                      |
| --------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| PREMATCH prediction         | `predictions.created_at`                  | **6h** for recompute (`PREMATCH_FRESHNESS_MS`); **72h** compute window; official = last row **before** `kickoff_at` | Outside 72h: **any age** returned (FR-01). Inside 6h: fingerprint mismatch ignored if features null (FR-02) |
| PREMATCH AI context (Redis) | Built at request; cache metadata          | `freshTtlSeconds: 120`, `staleTtlSeconds: 600`                                                                      | Serves stale context up to 600s while inputs change (lineups/injuries)                                      |
| PREMATCH AI insight         | `ai_insights.created_at`, `context_hash`  | Prematch cache TTL from env; historical **immutable** after first row                                               | Historical insight never invalidated on hash change (FR-04)                                                 |
| LIVE AI insight             | `ai_insights.created_at`                  | Recent query **15m**; periodic refresh **25m**; client read stale **30s**                                           | Old insight served until next schedule event                                                                |
| Live presentation           | `last_provider_sync_at` / live clock      | Stale sync **8m**; tail window **5h** after kickoff                                                                 | DB status live while UI forces FT presentation                                                              |
| Standings                   | Standings upsert + cache TTL              | Redis `standingsFresh: 1200s`                                                                                       | Rank snapshot in model/context may lag daily/6h cron                                                        |
| Form/H2H snapshots          | `form_snapshots` insert time              | **6h** refresh job                                                                                                  | UI non-PIT reads bypass snapshot as-of kickoff                                                              |
| Team history depth          | `ingestion_team_sync_state.history_state` | Repair incremental                                                                                                  | Model may run before repair completes (RC-01)                                                               |
| `prematch_readiness`        | `prematch_readiness_updated_at`           | Updated on today sync batch only                                                                                    | Flag stale for fixtures not in today’s provider date fetch                                                  |

---

## 6. Timezone (UTC storage vs Europe/Belgrade intent)

| Concern                      | Implementation                                                                                                                                    | Gap vs rule 6 (Belgrade for lifecycle/display)                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Storage                      | `fixtures.kickoff_at` timestamptz (UTC)                                                                                                           | Aligned                                                                                        |
| “Today” for ingestion        | `sync-fixtures-today` uses `anchor.toISOString().slice(0, 10)` (**UTC date**)                                                                     | Evening Belgrade matches can fall on **previous UTC date** — wrong day bucket for “today sync” |
| Dashboard “today / upcoming” | UTC date keys on `kickoff_at` slice                                                                                                               | Same UTC vs local mismatch for Serbia-centric “today”                                          |
| Fixtures list grouping       | **Viewer timezone** via `buildSortedDayGroupsInTimezone` / `formatDateKeyInTimezone`; legacy `groupFixturesByDayAndLeague` uses **UTC** day slice | Inconsistent: some surfaces Belgrade-aware, others UTC                                         |
| PRD fixtures window          | UTC today + 7d (`docs/PRD.md`)                                                                                                                    | Product spec explicitly UTC — **conflicts** with user rule 6 unless PRD updated                |
| Imminent warm / lineups      | **Wall-clock UTC** `now` → +90m (`warm-ai-prematch`, `sync-lineups`)                                                                              | Not aligned to Belgrade “imminent evening kickoffs” boundary                                   |
| Live “starting soon”         | `UPCOMING_SOON_HOURS = 3` from server `Date.now()`                                                                                                | UTC-agnostic offset (OK) but independent of Belgrade calendar day                              |
| Official prematch cutoff     | `predictions.created_at < kickoff_at`                                                                                                             | Correct instant comparison (TZ-safe)                                                           |

---

## 7. Recommended minimal readiness model (design only)

Goal: one **derived stage** per fixture for API + UI, without rewriting ingestion architecture.

### 7.1 Single server-side snapshot (extend existing JSON columns)

Add a versioned `fixture_readiness` document (could evolve from `prematch_readiness` + `match_ingestion_state`) computed on write hooks:

```ts
type FixtureLifecyclePhase =
  | "UPCOMING"
  | "PREMATCH_COLLECTING"
  | "PREDICTION_READY"
  | "AI_READY"
  | "LIVE"
  | "LIVE_UPDATING"
  | "FINISHED"
  | "POSTMATCH_COLLECTING"
  | "HISTORICAL";

type DependencyStatus =
  | "required_met"
  | "optional_missing"
  | "not_yet_available"
  | "unavailable"
  | "insufficient"
  | "stale";

type FixtureReadinessSnapshot = {
  version: 1;
  phase: FixtureLifecyclePhase;
  evaluatedAt: string; // UTC ISO
  timezonePolicy: "Europe/Belgrade"; // for display windows only
  dependencies: Record<
    string,
    { status: DependencyStatus; asOf?: string; reason?: string }
  >;
  prediction?: {
    predictionId: string;
    createdAt: string;
    isOfficial: boolean; // created_at < kickoff_at
    fingerprint: string;
    stale: boolean;
  };
  aiPrematch?: {
    insightId?: string;
    contextHash?: string;
    matchesCurrentInputs: boolean;
  };
};
```

### 7.2 Rules (minimal)

1. **Phase** = `resolveFixturePhase(status)` plus overrides: if `!isAuthoritativeLivePresentation` while status live → treat as **FINISHED** for UI only (already partially done).
2. **PREDICTION_READY** iff official or fresh prematch row exists **and** `hasMinimumModelSignal(input_snapshot)` **and** not generic baseline (or explicitly tiered as `baseline` in UI).
3. **AI_READY** iff prematch insight exists for **current** `contextHash` (or explicit `staleInsight: true` flag).
4. **Never** insert post-kickoff PREMATCH without marking `isOfficial: false` and hiding from “pre-match analysis” CTAs (fixes FR-03).
5. **Unify live status** — one exported set shared by DB generated column (migration), Redis helper, and `status-map`.
6. **Belgrade windows** — compute `imminent` / `today` ingestion allowlists using `formatDateKeyInTimezone(now, "Europe/Belgrade")` while keeping UTC storage.
7. Expose `GET /api/fixtures/:id/readiness` reading snapshot only (no fake zeros); match page gates auto-ensure on `AI_READY` eligibility, not only `MISS`.

### 7.3 Computation placement (reuse patterns)

- After `ingestFixtureFromRaw`, `refreshPrematchReadinessBatch`, match-details persist, prediction insert, insight insert — enqueue **idempotent** `evaluateFixtureReadiness(fixtureUuid)` (same style as existing readiness refresh, single file beside `fixture-prematch-readiness.ts`).
- Do **not** block ingestion on OpenAI; readiness reflects last known state.

---

## 8. Assumptions

1. Scorence dev Supabase (`zovobemlpqoclyjhvkpw`) matches production schema described in migrations through `0039` (not re-queried live for this doc).
2. “Europe/Belgrade intent” follows user rule 6 even where PRD currently specifies UTC calendar windows — called out as spec tension in §6.
3. **Odds** are out of scope product-wide (marketing/PRD: no bookmaker odds).
4. Lifecycle labels in this audit map to code concepts, not future product copy.
5. Guest users never receive prematch insight API data (`GUEST_FORBIDDEN`); readiness matrix for AI stages applies to authenticated paths unless noted (guest live delta may still expose probabilities).
