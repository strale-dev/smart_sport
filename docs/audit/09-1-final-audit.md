# Final audit — Scorence football intelligence pipeline

**Date:** 2026-10-11  
**Auditor scope:** Read-only code trace + Supabase prod dev (`zovobemlpqoclyjhvkpw`) + full test/lint/typecheck run. **No application code changed** in this task.  
**Prerequisites read:** All reports in `docs/audit/` (`00` through `08-2`).

---

## Executive summary

The pipeline from API-Football through Postgres, readiness gates, in-house predictions, OpenAI insights, API routes, and the match-page React Query stack is **architecturally coherent** and has been **hardened across audits 01–08** (ingestion safety, readiness model, prematch/live prediction validation, live probability P0 fix, AI state machine, live AI meaningful events, match UI decoupling).

**Production readiness for “serious” use:**

| Surface                                                                    | Verdict                                                                                                                                                                                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pre-match fixtures with adequate history** (top leagues, repaired teams) | **Ready** — fixture-scoped predictions, PIT AI context, hash-gated insights, explicit unavailable states                                                                                                         |
| **Finished matches with ingested details**                                 | **Mostly ready** — historical prematch + delta; post-match events/stats uneven for minor cups                                                                                                                    |
| **Live match experience**                                                  | **Conditional** — requires `LIVE_POLLING_ENABLED=true` on Production **and** live sync freshness; code now **refuses mismatched live probabilities** instead of showing anchor-at-0:0 while scoreboard shows 2:0 |
| **Minor/cup teams with &lt;10 finished rows**                              | **Degraded by design** — expect `DATA_INSUFFICIENT`, generic model tier, or blocked AI; must not be marketed as full analytics                                                                                   |

**Top blockers before treating live as production-grade:** confirm Production live polling env, clean up **stuck `ingestion_sync_runs`**, and close **post-match detail gaps** for fixtures that reached FT without events/stats.

---

## End-to-end trace (authoritative flow)

```
API-Football (v3.football.api-sports.io)
  → lib/api-football/client.ts (+ quota, dedup, fetch-outcome)
  → adapters + lib/ingestion/upsert.ts | match-details-upsert.ts | ingest-live-tick.ts
  → Postgres (fixtures, events, stats, lineups, form/h2h, predictions, ai_insights)
  → lib/fixtures/readiness/* (phase, gates, fixture_readiness JSON, Europe/Belgrade windows)
  → lib/services/predictionService.ts (PREMATCH / LIVE + validation layers)
  → lib/services/aiContextService.ts → lib/ai/hash.ts (context_hash)
  → lib/services/aiService.ts (+ Redis cache, usage gates)
  → app/api/* (fixtures, predictions, ai/prematch|live, matches/snapshot, live-probability-delta)
  → components: MatchLiveSession → AIInsightProvider → MatchAIHeroSection
```

**Live side path (when enabled):** `POST /api/live/watch` → `lib/live/poller.ts` → internal poll tick → `fixture-live-ingest-pipeline` → `meaningful-event-pipeline` (detector → live prediction → gated live AI) → Realtime broadcast.

**Read authority:** With default `API_FOOTBALL_INGEST_ONLY`, UI reads Postgres via `footballService`; provider fill is recovery/on-demand.

---

## Verification fixtures

Original choices from [00-architecture-map.md](./00-architecture-map.md) (2026-10-07) are **all FT** as of this audit. Scenario **roles** are preserved; **live** and **upcoming** traces use **replacements** for active lifecycle checks, while originals remain valid for **finished / post-match** DB forensics.

| Scenario                       | Fixture ID  | Match                                  | League                              | Season | Kickoff (UTC)          | Status (DB)                                                 | Replacement note                                           |
| ------------------------------ | ----------- | -------------------------------------- | ----------------------------------- | ------ | ---------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| **A — Upcoming** (was 1640694) | **1558652** | KVC Westerlo vs Antwerp                | Jupiler Pro League                  | 2026   | 2026-10-11 16:30:00+00 | NS                                                          | Original 1640694 now FT 3–1; use 1558652 for upcoming path |
| **B — Live** (was 1635578)     | **1575183** | 1. FC Köln vs Borussia Mönchengladbach | (bundesliga-related cup/league row) | 2026   | 2026-10-11 13:30:00+00 | 1H, 1–0 @~26', `is_live=true`, sync ~2026-10-11 13:57:49+00 | Original 1635578 now FT 0–1                                |
| **C — Finished**               | **1629006** | Mexico vs Chile                        | Friendlies                          | 2026   | 2026-10-07 02:30:00+00 | FT 0–2                                                      | Unchanged                                                  |

**Original trio (finished forensics):**

| ID      | Final score | Home/Away provider IDs | Last provider sync (UTC) |
| ------- | ----------- | ---------------------- | ------------------------ |
| 1640694 | 3–1         | 6541 / 28389           | 2026-10-07 23:36:48      |
| 1635578 | 0–1         | 316 / 307              | 2026-10-07 23:36:48      |
| 1629006 | 0–2         | 16 / 2383              | 2026-10-07 23:36:48      |

---

## Scenario A — Upcoming (1558652)

### Trace

1. **Ingestion:** Row present via `sync-fixtures-future` / today sync (kickoff within 7-day horizon). GHA 15m `sync-fixtures-today` refreshes NS fixtures and batch-evaluates readiness.
2. **DB:** Teams home **261** (Westerlo) vs away **740** (Antwerp); league provider id from join (Pro League). `fixture_readiness` **null until first evaluate** (lazy persist on readiness API or ingestion hook).
3. **History:** Westerlo **1** finished scored match in DB; Antwerp **29** — Westerlo is **`DATA_INSUFFICIENT`** for 30+ depth; Antwerp partial. Multi-season repair cron exists (`repair-team-history`) but Westerlo depth not yet repaired.
4. **Readiness:** Expected phase `UPCOMING` / imminent (Belgrade window); gates should block or tier-down AI until `aiContextReady` + fingerprint + hash (see `lib/fixtures/readiness/evaluate.ts`, FR-01–04 from 03-2).
5. **Prediction:** No `predictions` row in DB yet at audit time — consistent with **outside compute window**, insufficient signal, or not yet requested/warmed.
6. **AI:** No `ai_insights` row — expected until warm cron or user POST with gates open.
7. **API → UI:** `GET /api/ai/prematch/[id]` may compute prediction on demand; `AIInsightProvider` uses readiness + canonical states (`06-2`); core match header does not await AI (`08-1`).

### Identity checks

- Home/away FKs align with team names (Westerlo home, Antwerp away).
- No cross-fixture prediction rows for this `provider_id` in DB.

### Gaps

- **Shallow history for home side** — product must show explicit “insufficient history”, not generic win% (gates + `modelTier` in 04-1).
- **`fixture_readiness` null** on many fixtures until touched — ops cannot query “all imminent AI-ready” from DB alone without batch evaluate.

---

## Scenario B — Live (1575183)

### Trace

1. **Live state:** DB shows `1H`, score **1–0**, minute ~26, `last_provider_sync_at` recent (bulk live-center tick pattern: identical sync timestamp across many live rows at 13:57:49+00).
2. **Ingestion:** `sync-live-center` (GHA */15) + optional per-fixture poll when viewers present (`LIVE_POLLING_ENABLED`).
3. **Events/stats:** Not fully queried in this audit pass; pipeline writes via ingest tick when polling on.
4. **Live prediction:** No LIVE `predictions` rows for 1575183 at SQL snapshot — may appear after meaningful-event pipeline or first viewer poll; if polling **disabled** on Production, score may update from date sync while **live model/AI stall** (LS-01 mitigated in readiness: `live_polling_disabled`).
5. **Live AI:** `meaningful-event-pipeline` + generation gate (45s soft interval for periodic-only, dedupe keys) — see 07-1.
6. **API → UI:** `live-probability-delta` → `resolveLiveProbabilityDelta` validates row vs fixture (`05-2`); `AIHeroCard` uses validated bar, not stale insight-linked probs.

### Live probability matrix (required explicit test)

| Case                        | Coverage                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 0:0 early                   | Model normalization test; live validation alignment tests                                                     |
| 1:0 / 0:1                   | `liveProbability.test.ts` (0–1 @17'); validation 1–0 aligned case                                             |
| 2:0 @75'                    | Model favors home ≥85%; **validation rejects** stored 0:0 @15' row vs 2:0 board (`SCORE_MISMATCH`)            |
| 0:2 @77' strong home anchor | Model home &lt;20%, away leads (`liveProbability.test.ts` audit repro)                                        |
| 3:0 / 0:3                   | **Not dedicated unit tests** — model uses same Poisson/live scoring; recommend future parameterized test (P2) |
| Halftime / FT               | `meaningful-event-pipeline.test.ts` (HT, FT broadcast kinds); `eventDetector.test.ts` (FT whistle)            |
| Red card                    | `eventDetector.test.ts` (second yellow → RED_CARD)                                                            |
| Late goal                   | Detector goal events + pipeline tests                                                                         |
| Finished                    | Delta validation relaxed for non-live status; historical delta allowed                                        |

**“Leader 2:0 but loser 90–95%”:** Prevented at **presentation layer** when snapshot mismatches (`SCORE_MISMATCH` → `liveAvailable: false`). Model layer assigns high home prob for **aligned** 2:0 @75' (intended). Mis-display from **stale row + live scoreboard** was the P0 fixed in 05-2.

---

## Scenario C — Finished (1629006) + originals

### Mexico vs Chile (1629006)

| Check                  | Result                                                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity               | Prematch snapshot: fixture **1629006**, home **16**, away **2383**, league **10** — matches fixture row                                                                                                     |
| Result                 | FT **0–2** (Chile away win)                                                                                                                                                                                 |
| Prematch prediction    | Created **before** kickoff (`2026-10-07 02:43:43+00`): home **98.04%** / draw 0.98% / away 0.98% — **model wrong**, not identity leak                                                                       |
| Live predictions       | Early LIVE @5' (~98% home); final LIVE @90' (~8% home / **91% away**) — directionally matches result                                                                                                        |
| LIVE snapshot identity | `homeTeamProviderId` / `leagueProviderId` **null** in `input_snapshot` on LIVE rows — prematch rows carry identity; live validation relies primarily on **fixture id + score + minute** (technical debt P2) |
| AI                     | PREMATCH + 2× LIVE insights, distinct `context_hash`, linked `prediction_id`, prompt **1.3.0**                                                                                                              |
| Post-match data        | **19 events**, **2** stat rows — good analytical availability                                                                                                                                               |
| Readiness JSON         | **null** on row (lazy)                                                                                                                                                                                      |

### Original “live” fixture 1635578 (now FT)

- Prematch: away favored **78.4%** (aligned with 0–1 result).
- PREMATCH AI insight present.
- **0 events, 0 stats** — post-match processing **did not** backfill details (P1 reliability for cup replay/analysis tabs).

### Original “upcoming” 1640694 (now FT 3–1)

- **No predictions, no AI insights** in DB — likely **insufficient history** (home team **1**, away **2** finished matches) + cup tier; acceptable if UI shows unavailable, **not** if generic narrative were shown (none stored).

---

## Historical data (cross-cutting)

| Requirement                 | Assessment                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 30+ matches where available | **Yes** for top clubs (e.g. Köln 352, Gladbach 524); **no** for Westerlo (1), cup minnows                                       |
| Multi-season fallback       | `buildMultiSeasonCompletedWindow` + repair cron (02-1)                                                                          |
| Home/away splits            | PIT scopes ALL/HOME/AWAY in feature layer (02-2)                                                                                |
| No future leakage           | Prematch AI uses PIT `buildFixtureHistoryFeatures`; **UI form/H2H tabs still use non-PIT `analyticsService`** (03-1 FR-05 — P1) |
| Ordering                    | `kickoff_at < beforeAt`, kickoff desc                                                                                           |
| Compact LLM payload         | `analyticsCompact`, byte cap 16KB, max 3 recent examples (02-2)                                                                 |

---

## Prediction correctness (cross-cutting)

- **Fixture-specific validation:** `prematch-validation.ts`, identity on read (`04-1`).
- **Official prematch:** `created_at < kickoff_at`; no post-kickoff latest fallback.
- **Generic baseline:** Stored with tier; excluded from top picks; display experience gating.
- **Live:** Separate type; delta resolver + validation (`05-2`).

---

## AI lifecycle (cross-cutting)

- **context_hash:** Centralized inputs (`context-hash-input.ts`); live includes prediction id + snapshot id + trigger event ids (06-1, 07-1).
- **Eligibility:** Readiness gates + `canGeneratePrematchNarrative`; guests 403 on AI routes.
- **Cache identity:** Unique `(fixture_id, type, context_hash)`; Redis TTL prematch/live.
- **Failures:** Prior valid insight preserved; `GENERATION_FAILED` vs silent FALLBACK reduced (06-2).
- **Concurrency / limits:** Locks, usage gates, warm cron without user id.
- **Generic narrative guard:** `narrative-fixture-specificity.ts`.

---

## Frontend architecture (cross-cutting)

- **Decoupling:** Match core independent of AI generation (`08-1`).
- **States:** Canonical → `match-ai-ui-state` → hero/overview copy.
- **Live probs:** Validated delta only on hero (`05-2`, `08-1`).
- **Performance:** Provider phase from live context, split contexts, delta ownership (`08-2`).
- **Race mitigation:** Auto-ensure key includes hash/fingerprint (`06-2`).

---

## Technical debt search (classified)

| Class                       | Finding                                                                                    | Severity                          |
| --------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------- |
| TODO                        | 3 items (waitlist double opt-in, follow bonus, privacy comment)                            | P2                                |
| FIXME                       | 0                                                                                          | —                                 |
| `skipped: true`             | ~18 files (live poller, crons when polling off / lock held)                                | Expected; document ops            |
| Swallowed `.catch(() => …)` | RSC pages (favorites, coverage), broadcasters, footballService optional reads              | P2 — mostly non-football-critical |
| Hardcoded football outcomes | `GENERIC_BASELINE_WIN_PROBABILITIES` for **signal detection only** (prematch-model-signal) | OK if not shown as fixture probs  |
| FALLBACK paths              | Legacy schema mapping; generation failure paths tightened in 06-2                          | P2 cleanup                        |
| Duplicate cron              | Vercel + GHA overlap by design (00 map)                                                    | P2 ops                            |
| Live missing score coercion | `live-features.ts` model input                                                             | P1 (documented in 06-1)           |
| Non-PIT UI analytics        | Form/H2H on match tabs                                                                     | P1                                |
| Lazy `fixture_readiness`    | Null until evaluate                                                                        | P1 ops/UX                         |
| Stuck `ingestion_sync_runs` | Multiple `running` since 2026-10-02–10 (future sync, backfill)                             | **P1** (masks job health)         |
| LIVE row snapshot identity  | Missing team/league ids in older LIVE snapshots                                            | P2                                |
| No odds pipeline            | PRD vs code                                                                                | P2 product gap                    |

---

## Observability

**Can production debugging answer…?**

| Question                       | Answer                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Which fixture failed?          | **Mostly yes** — structured `[ingestion]` JSON with `fixture_provider_id`, `job_name`, `resource`, `reason`         |
| What data was missing?         | **Partially** — readiness snapshot when persisted; per-fixture ingest unit logs; not all paths write DB audit table |
| What prediction was generated? | **Yes** — `predictions.input_snapshot` + service logs on live compute                                               |
| What context / hash for AI?    | **Yes** — `ai_insights.context_hash`, prompt version                                                                |
| Why AI failed?                 | **Improved** — `generation-failure.ts`, canonical reason codes                                                      |
| What user saw?                 | **Indirect** — API response states; no single “user_view” log                                                       |
| Stale data?                    | **Partially** — `last_provider_sync_at`, delta `sourceSnapshot`, readiness `stale` items                            |

**Gap:** No correlated trace id from browser → API → cron; PostHog/Sentry depend on instrumentation elsewhere. Stuck sync runs undermine **ingestion SLO dashboards**.

---

## Scores (1–10)

| Area                   | Score | Rationale                                                                                |
| ---------------------- | ----- | ---------------------------------------------------------------------------------------- |
| Ingestion reliability  | **7** | Strong client + budgets + safe writes; stuck sync runs and uneven match-details backfill |
| Data correctness       | **8** | Home/away and PIT prematch solid; live presentation guard; cup/post-match holes          |
| Fixture lifecycle      | **8** | Central readiness + Belgrade windows; lazy persist weakens batch ops                     |
| Historical data        | **7** | Repair path exists; depth uneven by team/league                                          |
| Prediction correctness | **7** | Validation/fingerprint strong; model accuracy not guaranteed (Mexico 98% home)           |
| AI lifecycle           | **8** | Hash, gates, failure preservation, live binding                                          |
| Live system            | **7** | Good pipeline when enabled; env flag + sync freshness critical                           |
| Frontend architecture  | **8** | Clear layering, validated live probs, canonical UI states                                |
| Performance            | **7** | RSC/query optimizations; readiness evaluate cost on batch                                |
| Observability          | **6** | JSON logs good; stuck runs + no unified trace                                            |

---

## Remaining issues

### P0 (must fix for incorrect user-facing data / integrity / silent critical failure)

| ID   | Issue                                                                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1 | **Production `LIVE_POLLING_ENABLED` unverified here** — if false, live probabilities/AI may be unavailable or stale while status appears live; readiness now surfaces `live_polling_disabled` but env must be set intentionally |
| P0-2 | **Showing live win probabilities without validation** — **mitigated in code (05-2)**; regression requires keeping delta path mandatory for hero bars                                                                            |

_No open P0 code defect found equivalent to pre-05-2 stale live bar in current branch; P0-1 is **deployment/configuration**._

### P1

| ID   | Issue                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ |
| P1-1 | Stuck **`ingestion_sync_runs`** rows (`running` for days) — misleading ops, possible lock/checkpoint confusion                       |
| P1-2 | FT fixtures **without events/stats** (e.g. 1635578) — post-match UX/analysis incomplete                                              |
| P1-3 | **Insufficient history** fixtures (1640694, 1558652 home side) — must consistently show unavailable/low tier, never imply full model |
| P1-4 | **Non-PIT form/H2H** on match UI vs PIT AI (03-1)                                                                                    |
| P1-5 | **`fixture_readiness` null** until evaluated — batch warm/sort relies on cron refresh                                                |
| P1-6 | Live model **missing score → 0** coercion (06-1)                                                                                     |

### P2

| ID   | Issue                                                                      |
| ---- | -------------------------------------------------------------------------- |
| P2-1 | Parameterized live score matrix tests (3:0, 0:3, red card effect on probs) |
| P2-2 | LIVE `input_snapshot` team/league identity fields on all inserts           |
| P2-3 | Lint warnings (13), duplicate cron documentation                           |
| P2-4 | Odds not implemented                                                       |
| P2-5 | TODO/FOLLOW/waitlist items                                                 |

---

## Top 10 actions (ordered)

1. **Set and verify `LIVE_POLLING_ENABLED=true` on Production** + monitor `live_sync` readiness / `last_provider_sync_at`.
2. **Repair stuck `ingestion_sync_runs`** (mark failed/complete, root-cause long `sync-fixtures-future` / backfill runs).
3. **Extend `sync-match-details` coverage** for FT cup/friendly fixtures with 0 events (1635578 class).
4. **Run / schedule `repair-team-history`** for teams in imminent windows (Westerlo, cup pairs).
5. **Batch evaluate and persist `fixture_readiness`** for NS fixtures in warm window (imminent cron input quality).
6. **Migrate match tab form/H2H to PIT reads** (align with AI/history layer).
7. **Add observability dashboard** on `[ingestion]` JSON + prediction/AI failure reason codes.
8. **Add parameterized live probability integration tests** for 3:0, 0:3, HT, red card.
9. **Persist team/league ids on all LIVE prediction snapshots** for symmetric validation.
10. **Document hybrid Vercel/GHA cron** ownership for on-call (00 map duplicate triggers).

---

## Remaining risks

- **Config drift:** `.env.example` vs default false live polling.
- **Quota / GHA 58s cap:** Jobs rely on checkpoints; stuck cursor if runs never finish.
- **Model risk:** High-confidence wrong prematch (Mexico) is a **product trust** issue, not a data-integrity bug — confidence caps help but do not eliminate.
- **Redis outage:** Live locks/dedup degrade; concurrent ingest risk on events (01-2).
- **LLM cost spikes:** Meaningful-event + FT/HT triggers increase calls; gates limit noise.

---

## Test run results (2026-10-11, this audit)

| Command                 | Result                                   |
| ----------------------- | ---------------------------------------- |
| `npm.cmd run test:ci`   | **869 passed** (202 files), ~136s        |
| `npm.cmd run lint`      | **0 errors**, 13 warnings (pre-existing) |
| `npm.cmd run typecheck` | **Passed**                               |

No code changes were made after these runs (before = after).

---

## Final recommendation

**Scorence is ready for serious production use for pre-match and finished-match experiences on well-ingested leagues**, with explicit unavailable states when history or readiness is insufficient — **provided** ops confirm ingestion crons, repair/backfill health, and fix stuck sync run records.

**Live intelligence is production-viable only with live polling enabled, fresh provider sync, and the 05-2 validation path left intact** on all user-facing probability surfaces. Treat minor/cup fixtures as **tier-2** until history repair and match-details backfill prove 30+ depth and post-match completeness.

Prioritize **P1-1 (stuck runs), P1-2 (post-match gaps), and Production live env verification** before marketing live AI/win-probability as core differentiators.

---

## Assumptions

1. Supabase project `zovobemlpqoclyjhvkpw` reflects Production-like data used in prior audits.
2. Code on `main`/workspace matches deployed Production for audits 04–08 fixes (live delta validation, readiness 0040, etc.).
3. SQL counts for team history include all terminal statuses in query; cup teams may gain depth outside observed window.
4. Live fixture **1575183** sync timestamp shared across bulk tick implies live-center ingest, not necessarily per-viewer poll.
5. `fixture_readiness` null means “not yet evaluated”, not “unevaluated in code paths”.
6. Production Vercel env vars were not read (secrets); live polling state is inferred from code defaults + DB sync patterns.
