# AI + Ingestion recurring failure — Phase 1 RCA

**Date:** 2026-09-26  
**Scope:** Phase 1 investigation only (no fix code in this document).  
**Evidence sources:** Repository code/git, Scorence dev Supabase (`user-supabasei`), Sentry (`scorence`), PostHog (14d).

---

## Executive summary

The recurring “missing AI analysis” and “cron errors that come back” are **one connected reliability problem**, not two bugs:

1. **Ingestion does not reliably produce fixture-specific model inputs** for the expanded competition set (thin form/standings/H2H → logistic **generic baseline** predictions).
2. **AI generation is hard-gated** on non-generic, fixture-specific predictions (`isFixtureSpecificPrematchModel`). ~**63%** of stored prematch predictions in dev are generic baseline and **cannot** receive LLM narrative.
3. **Warm-up cron reports success while failing silently** (`ok: true` with `fallback` / `prematch_insight_unavailable`), and **optional live polling** (`LIVE_POLLING_ENABLED`, default **off**) makes core-adjacent jobs return `skipped: true` with **HTTP 200**, so schedulers stay green while data stays stale.
4. Prior fixes treated **HTTP status**, **timeouts**, and **UI symptoms** — not the **dependency chain** from historical ingestion → model features → AI eligibility → warm coverage window.

**Primary root cause:** _Data completeness and scheduling coverage do not meet the assumptions introduced by fixture-specific prediction gating (Sep 2026), while cron/observability semantics hide partial failure._

---

## Cron / ingestion topology (verified in repo)

| Job                  | Trigger(s)                                                               | Route                            | Auth                               | Lock TTL                           | Success rule (actual)                                                        | Downstream                                                    |
| -------------------- | ------------------------------------------------------------------------ | -------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| sync-fixtures        | Vercel daily `0 4 * * *`                                                 | `/api/cron/sync-fixtures`        | `CRON_SECRET` (503 dev if missing) | 300s                               | **`ok: true` always**                                                        | fixtures ±7d (prod), optional 1 FT match-details              |
| sync-fixtures-today  | GHA `*/15 * * * *`                                                       | `/api/cron/sync-fixtures-today`  | same                               | 300s                               | `ok` if fetch ok; partial upsert ok if budget stop                           | today’s fixtures + Redis date cache                           |
| sync-fixtures-future | GHA `0 3 * * *`                                                          | `/api/cron/sync-fixtures-future` | same                               | 300s (route `maxDuration` **300**) | **`ok` only if `fixtureErrors === 0`**                                       | horizon days + league-season sync (**WIP/uncommitted route**) |
| sync-live-center     | GHA `*/15`                                                               | `/api/cron/sync-live-center`     | same                               | 300s                               | skipped if `!LIVE_POLLING_ENABLED`; else partial ok                          | live fixtures + reconcile stale                               |
| sync-lineups         | GHA `*/15`                                                               | `/api/cron/sync-lineups`         | same                               | 300s                               | skipped if lineups kill-switch / quota; else **`ok: true` even with errors** | lineups                                                       |
| sync-standings       | GHA `0 */6`, Vercel daily `30 4`                                         | `/api/cron/sync-standings`       | same                               | 300s                               | quota-gated; **`ok: true`**                                                  | standings (skip fetch if rows exist)                          |
| sync-match-details   | Vercel daily `0 5`                                                       | `/api/cron/sync-match-details`   | same                               | 300s                               | **`ok: true`**                                                               | FT stats/events/lineups batch                                 |
| warm-ai-prematch     | Vercel daily `15 5` (scope=daily); GHA `*/15` **`?scope=imminent` only** | `/api/cron/warm-ai-prematch`     | same                               | **600s**                           | **`ok: true` always**; counts fallback/errors                                | shared `ai_insights` PREMATCH                                 |
| reap-stale-locks     | GHA `*/5`, Vercel daily `45 5`                                           | `/api/cron/reap-stale-locks`     | same                               | 300s                               | **skipped if `!LIVE_POLLING_ENABLED`**                                       | live poll locks only                                          |
| reconcile-ai-usage   | GHA `*/5`                                                                | `/api/cron/reconcile-ai-usage`   | same                               | 300s                               | —                                                                            | ai_usage                                                      |
| refresh-analytics    | Vercel `0 3`                                                             | `/api/cron/refresh-analytics`    | same                               | 300s                               | —                                                                            | analytics                                                     |
| cleanup-ai-usage     | Vercel `0 2`                                                             | `/api/cron/cleanup-ai-usage`     | same                               | 300s                               | —                                                                            | ai_usage cleanup                                              |
| sync-player-bios     | Vercel weekly                                                            | `/api/cron/sync-player-bios`     | same                               | 300s                               | —                                                                            | player bios                                                   |

**Scheduler split:** Vercel Hobby = **once/day** per path in [`vercel.json`](../vercel.json). Sub-daily work is delegated to [`.github/workflows/ingestion-schedule.yml`](../../.github/workflows/ingestion-schedule.yml) → `scripts/trigger-production-cron.mjs` (58s timeout, retries 408/429/5xx).

**HTTP semantics:** [`cronJobHttpStatus`](../../lib/ingestion/cron-run.ts) → **`skipped: true` ⇒ 200** even when `ok: false`. GHA only fails on non-2xx.

---

## Live DB snapshot (Scorence dev, 2026-09-26)

| Metric                            | Value                                                     |
| --------------------------------- | --------------------------------------------------------- |
| fixtures                          | 14,936                                                    |
| ai_insights (all)                 | 117                                                       |
| predictions (PREMATCH)            | 245                                                       |
| **Likely generic baseline preds** | **154 (~63%)**                                            |
| Upcoming NS/TBD (7d)              | 207                                                       |
| Upcoming with PREMATCH insight    | **0**                                                     |
| Upcoming with PREMATCH prediction | **1**                                                     |
| `ingestion_sync_runs`             | 1 failed backfill, **1 stuck `running`** since 2026-09-25 |
| `ingestion_league_season_state`   | 30 rows                                                   |

PostHog (14d): `ai_insight_generated` **9**, `ai_generate_clicked` 6, `ai_live_insight_unavailable` 22.

Sentry (14d): heavy **`prematch_insight_unavailable`** on `GET /api/cron/warm-ai-prematch` ([JAVASCRIPT-NEXTJS-H](https://scorence.sentry.io/issues/JAVASCRIPT-NEXTJS-H)); **`warm_ai_prematch_degraded`** ([JAVASCRIPT-NEXTJS-J](https://scorence.sentry.io/issues/JAVASCRIPT-NEXTJS-J)); **`prematch_insight_fallback`** ([JAVASCRIPT-NEXTJS-K](https://scorence.sentry.io/issues/JAVASCRIPT-NEXTJS-K)). No recent `sync-fixtures*` exception spikes in the same search window — cron pain is dominated by **warm-ai**, not fixture HTTP 500s.

---

## Hypothesis verdicts

| ID                         | Verdict                              | Evidence                                                                                                                                                                |
| -------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1 Success masking         | **Confirmed**                        | `cronJobHttpStatus`, live-center skip, warm `ok: true` with degradations                                                                                                |
| H2 LIVE_POLLING coupling   | **Confirmed (live-adjacent)**        | `ingestLiveCenterTick`, `reapStaleLiveLocks` skip; ingest-only live reads gated in docs/code                                                                            |
| H3 Inconsistent `ok` rules | **Confirmed**                        | `syncFixtures` always true; `syncFixturesFuture` strict; `syncFixturesToday` partial                                                                                    |
| H4 Duplicate/racing crons  | **Partial**                          | Vercel daily + GHA sub-daily overlap by design; Redis `lock:cron:*` serializes same job; **15m GHA matrix runs 4 jobs sequentially** (good) but each can hit 58s limit  |
| H5 Context build throws    | **Possible, not primary in samples** | `buildPrematchContext` uses `Promise.all`; failures → FALLBACK; Sentry shows fallback on warm cron                                                                      |
| H6 Context-hash churn      | **Secondary**                        | Hash includes lineups/standings/dataMissing; re-ingestion invalidates cache — acceptable if warm re-runs                                                                |
| H7 Prediction gating       | **Confirmed — primary AI blocker**   | 63% generic preds; `generatePrematchInsight` returns `GENERATION_NOT_ALLOWED`                                                                                           |
| H8 WIP history refactor    | **Confirmed partial fix in flight**  | Uncommitted `sync-fixtures-future`, backfill tiers, `ingestion_sync_state`, `team-aggregates`; GHA already schedules future sync but production may lack deployed route |

---

## AI pipeline divergence (4 fixtures)

| Fixture       | Status | Form/H2H in DB           | Prediction                     | Generic baseline?              | PREMATCH insight | First divergence                                                                                               |
| ------------- | ------ | ------------------------ | ------------------------------ | ------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| **1606670** ✓ | FT     | form rows; ranks         | Yes, specific probs            | No                             | Yes              | End-to-end OK (warm ~06:13 UTC)                                                                                |
| **1606673** ✓ | FT     | similar                  | Yes                            | No                             | Yes              | (same batch as 1606670)                                                                                        |
| **1545658** ✗ | NS     | partial form (home null) | Yes                            | **Yes (0.5718/0.2544/0.1738)** | No               | **`isFixtureSpecificPrematchModel` → false** (`GENERATION_NOT_ALLOWED`)                                        |
| **1557412** ✗ | FT     | rich form + H2H          | Yes, **specific** (0.809 home) | No                             | No               | **After prediction gate** — eligible but **never persisted** (warm coverage / user trigger gap; not data gate) |
| **1570401** ✗ | FT     | form + H2H               | **No**                         | —                              | No               | **`getOrComputePrematch` never produced row**                                                                  |

**1545658** `input_snapshot` excerpt: `form5HomePpg: null`, `form5AwayPpg: 1.5`, ranks null → minimum signal weak; model outputs **exact generic baseline** → AI hard-blocked by design ([`aiService.ts`](../../lib/services/aiService.ts), [`prematch-availability.ts`](../../lib/ai/prematch-availability.ts)).

**1557412** contradicts “missing data” narrative: plenty of form/H2H and a **HIGH** confidence specific prediction, yet **zero** insight — classic **scheduling/eligibility window** failure (pred created 2026-09-19; kickoff 2026-09-20; warm **imminent** only ±90m via GHA; daily Vercel warm once at 05:15 UTC with **daily** scope 36h — easy to miss if lock/contention/fallback).

---

## Why ingestion schedule errors keep coming back

1. **Dual-scheduler architecture (Vercel Hobby + GHA)** — Every sub-daily job depends on repo secret `CRON_SECRET`, `PRODUCTION_SITE_URL`, and external HTTP. Transient 5xx/timeout retries ([`trigger-production-cron.mjs`](../../scripts/trigger-production-cron.mjs)) fix **symptoms**; misconfiguration or Pro/Hobby drift recreates failures.
2. **“Green” skipped jobs** — `LIVE_POLLING_ENABLED` default **false** ([`isLivePollingEnabled`](../../lib/env.ts)) → `sync-live-center` and `reap-stale-locks` always `skipped: true`, HTTP 200. Operators see success; live status freshness suffers.
3. **58–60s wall clock** — [`CRON_INGEST_WALL_CLOCK_BUDGET_MS`](../../lib/ingestion/cron-budget.ts) = 48s for upsert loops; fixes (`1f30e8e`, `5e051c0`) reclassified partial runs as success — **correct for cron stability**, but **fixtures remain incomplete** until next tick.
4. **Competition expansion > ingestion depth** — Full registry in production ([`config.ts`](../../lib/ingestion/config.ts)) with ±7d fixture window and incomplete historical backfill ([`FIXTURE-HISTORY-AUDIT.md`](../FIXTURE-HISTORY-AUDIT.md)) → many teams lack finished history for form/features.
5. **WIP not deployed** — `sync-fixtures-future` + league-season state in uncommitted work; GHA already calls route — **deploy mismatch** risk.

---

## Why AI analyses keep disappearing / missing

1. **Hard gate on fixture-specific model** (since `56cac51` / `2071763`) — Generic baseline predictions intentionally **do not** get LLM narrative. With **63%** generic preds in DB, most fixtures **cannot** show analysis regardless of UI.
2. **Warm cron scope gap** — GHA only calls **`scope=imminent`** (90m). Daily 36h window relies on **once/day** Vercel cron. Fixtures that become “specific” late (standings/form sync) may **miss** both windows.
3. **Warm reports success on degradation** — [`warmAiPrematchInsights`](../../lib/ingestion/warm-ai-prematch.ts) returns `ok: true` when `fallback > 0` or `errors > 0`; Sentry captures `warm_ai_prematch_degraded` but GHA stays green.
4. **Post-kickoff** — Historical backfill allowed (`8fb7692`) only on **signed-in user** open once; cron cannot backfill all FT gaps → “disappearing” on matches users never opened.

Not primarily: LLM quota, cache key bugs, or frontend fixture ID mix-ups (no evidence in this pass; frontend audit deferred to Phase 2).

---

## Underlying connection (ingestion ↔ AI)

```text
Thin historical / standings / form ingestion (esp. expanded leagues)
        ↓
Prematch feature vector incomplete → logistic fallback probabilities
        ↓
isFixtureSpecificPrematchModel === false
        ↓
generatePrematchInsight → UNAVAILABLE (no row written)
        ↓
warm-ai-prematch logs prematch_insight_unavailable; job ok:true
        ↓
User sees "missing AI" on match page; cron dashboard green
```

When data **is** sufficient (1557412), failure mode shifts to **warm coverage / partial LLM failure**, not gating — still **no insight row**.

---

## Prior fixes — what they solved vs why issues returned

| Commit    | Change                                      | Problem solved                 | Wrong assumption / why it returned        |
| --------- | ------------------------------------------- | ------------------------------ | ----------------------------------------- |
| `5e051c0` | HTTP 200 on skip; ingest time budget        | GHA red on live skip / timeout | Skip ≠ ingest; live off masked            |
| `a745cc6` | Per-fixture upsert isolation; GHA serialize | live/today 500 cascades        | Did not deepen historical data            |
| `1f30e8e` | Budget clock after fetch; partial = ok      | cron 500 on budget             | Incomplete batches need many ticks        |
| `4e1e69e` | reconcile-ai-usage via GHA                  | Hobby cron limit               | Another external trigger dependency       |
| `678e51b` | Softer API-Football errors in live tick     | Sentry noise / dashboard       | Empty data still empty                    |
| `56cac51` | **Gate AI on fixture-specific model**       | Nonsense LLM on generic preds  | **Requires ingestion depth not achieved** |
| `8fb7692` | Post-kickoff user backfill once             | Missing narrative on FT        | Does not scale via cron                   |
| `2071763` | Fixture load + prematch gates hardened      | Provider miss → PG             | Same gating + data deps                   |

---

## WIP uncommitted work (audit)

**Intent:** Close fixture-history gap (P8-DATA-9): `sync-fixtures-future`, `sync-league-season-fixtures`, `backfill-tiers`, `ingestion_sync_state` migration, `team-aggregates` in AI context, expanded `db-read`.

**Recommendation for Phase 2:** **Finish and deploy as one vertical slice** — do not revert. Wire `startIngestionSyncRun` / `finishIngestionSyncRun` into cron jobs; fix stuck `running` backfill row; add tests for `sync-fixtures-future` ok semantics vs partial failure.

**Risk if merged without Phase 2 hardening:** `sync-fixtures-future` can run >300s with default lock TTL; strict `ok: fixtureErrors === 0` will **re-red** GHA on any upsert blip.

---

## Feature-flag / environment matrix (code + docs)

| Variable                            | Default / dev              | Production expectation                   | Jobs / paths affected                                                    |
| ----------------------------------- | -------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| `LIVE_POLLING_ENABLED`              | **false** if unset         | `true` for Phase 5                       | sync-live-center, reap-stale-locks, live provider reads when ingest-only |
| `API_FOOTBALL_INGEST_ONLY`          | `true` dev                 | `false` prod                             | All UI reads; on-demand provider                                         |
| `API_FOOTBALL_LINEUPS_SYNC_ENABLED` | off in dev                 | on prod (or kill-switch false)           | sync-lineups body                                                        |
| `NEXT_PUBLIC_APP_ENV=production`    | —                          | widens fixture window ±7d; full registry | sync-fixtures volume                                                     |
| `INGESTION_USE_FULL_REGISTRY`       | —                          | implicit in prod                         | allowlist size                                                           |
| `CRON_SECRET`                       | optional dev (auth bypass) | **required**                             | all `/api/cron/*`                                                        |
| `FIXTURES_FUTURE_INGEST_DAYS`       | 21                         | tune                                     | sync-fixtures-future                                                     |

**Note:** `.env.example` documents `LIVE_POLLING_ENABLED=true` but runtime default is **false** — documentation drift.

---

## Recommended permanent fix (Phase 2 options — no code here)

**Option A (recommended): Dependency-first pipeline**

1. **Ingestion SLO:** fixture-specific readiness = minimum form **both teams** OR standings ranks for league fixtures; track per-fixture in DB (not only job-level `ok`).
2. **Deploy WIP** historical/future sync; ensure backfill completes tier-1 leagues before enabling full registry in prod.
3. **Warm-ai:** Run **daily scope** on GHA at least 2×/day; keep imminent; treat `fallback/errors > 0` as **`ok: false`** for scheduler OR separate `degraded: true` with GHA warning threshold.
4. **AI policy:** Allow LLM with **partial** fixture-specific signal (not generic baseline only) — optional data stays optional; **do not** require lineups/H2H for generation.
5. **Cron contract:** Unified result schema: `processed/succeeded/failed/skipped/reason`; HTTP 200 only for true skip (lock held); **degraded partial ≠ full success**.

**Option B:** Soften gating only (faster, repeats root cause) — generate on generic baseline with disclaimer. **Not recommended** per product intent of `56cac51`.

**Option C:** User-only generation (remove warm cron). Reduces cost; **does not** fix shared cached prematch product requirement.

---

## What prevents recurrence (after Phase 2)

- Fixture-level **readiness flags** consumed by warm-ai (skip with explicit reason, not silent UNAVAILABLE).
- **Regression tests:** generic baseline → no LLM; specific + partial optional data → LLM ok; warm partial failure → scheduler degraded; `LIVE_POLLING_ENABLED` off does not skip sync-fixtures-today.
- **Observability:** structured fields from §14 of investigation brief (`job_name`, `stage`, `fixture_id`, `error_type`).
- **Single deploy path** for GHA-scheduled routes (no calling undeployed APIs).

---

## Remaining risks / open questions

1. **Production Vercel env** — Confirm live values for `LIVE_POLLING_ENABLED`, `API_FOOTBALL_INGEST_ONLY`, lineups kill-switch (founder verification; not readable from repo).
2. **Production vs dev DB** — This RCA used **dev** Supabase; production coverage may differ but gating logic is identical.
3. **Stuck `ingestion_sync_runs`** — May hold misleading operational state until cleaned.
4. **Frontend** — `AIInsightProvider` race on fast navigation not validated in Phase 1.
5. **Context-hash invalidation** — May cause “disappearing” if users expect old narrative after lineups arrive; product decision needed.

---

## Files referenced (investigation)

- [`lib/ingestion/cron-run.ts`](../../lib/ingestion/cron-run.ts), [`lib/ingestion/warm-ai-prematch.ts`](../../lib/ingestion/warm-ai-prematch.ts)
- [`lib/services/aiService.ts`](../../lib/services/aiService.ts), [`lib/ai/prematch-availability.ts`](../../lib/ai/prematch-availability.ts)
- [`.github/workflows/ingestion-schedule.yml`](../../.github/workflows/ingestion-schedule.yml), [`vercel.json`](../../vercel.json)
- [`docs/FIXTURE-HISTORY-AUDIT.md`](../FIXTURE-HISTORY-AUDIT.md), [`docs/ING-3-pro-cutover.md`](../ING-3-pro-cutover.md)

---

## Phase 1 exit criteria

- [x] Cron topology documented from repo
- [x] Live DB + Sentry + PostHog sampled
- [x] 2 working + 2+ broken fixtures traced
- [x] Prior fix retrospective
- [x] Four mandatory questions answered (sections above)

**Next step:** Founder approval of this RCA → Phase 2 implementation plan (fixes + tests + observability + prod verification).
