# VTŠ Apps Team — remaining deficiencies

**Date:** 2026-11-01  
**Scope:** 3–5 evidence-based gaps after the assignment work.  
**References:** [09-1-final-audit.md](./09-1-final-audit.md), [09-2-fixes.md](./09-2-fixes.md), [AI-INGESTION-RCA.md](../rca/AI-INGESTION-RCA.md), [vts-apps-team-complete-plan.md](./vts-apps-team-complete-plan.md).

These are **not** regressions of Phases 2–4. They are leftover product/ops debt. The assignment made the user path degrade honestly; it did not make every cron green.

---

## D1 — Classifier covers only `sync-fixtures-today`

**Evidence:** `classifyProviderError` is imported only in `lib/ingestion/sync-fixtures-today.ts`. `ingestion_sync_runs` (48h snapshot, 2026-11-01) has **six** `sync-fixtures-future` failures, all `error_message = 'fetch failed'`, `fixturesUpserted = 0`. The table has **no `error_type` column**, so even a classified catch would not persist unless the job writes JSON logs or the schema is extended.

**09-1 link:** Observability score 6 — “Which fixture failed?” is only _mostly_ yes; stuck/opaque runs still hide job health ([09-1 § Observability](./09-1-final-audit.md)). RCA H1/H3: success masking and inconsistent `ok` rules.

**Why it matters:** Operators still cannot tell network vs Redis vs quota vs provider envelope from the rows they actually query.

**Next step (out of this assignment):** Reuse `classifyProviderError` in `sync-fixtures-future`, `sync-fixtures`, and `cron-run` catch; persist `error_type` + `retryable` on the run row (migration) or at least in `stats` JSON.

---

## D2 — Today/daily fixture jobs do not write `ingestion_sync_runs`

**Evidence:** Phase 2 plan and current code: `sync-fixtures-today` / `sync-fixtures` never call `startIngestionSyncRun`. Freshness therefore usually lands on `fixture_row` (`last_provider_sync_at`), not `ingestion_run`. SQL: **0 complete runs in 24h**, while 94 fixtures have `last_provider_sync_at` within 2h — the list is updating, the run table is not.

**09-1 link:** P1-1 was about _zombie_ `running` rows (now 0; 09-2 reconcile on `reap-stale-locks`). The complementary gap is **missing success rows** for the jobs that actually refresh the list.

**Next step:** Start/finish a run for today/daily fixture sync (or write a lightweight heartbeat). Then the badge’s first source stops being a dead query.

---

## D3 — Redis is fail-open in app code, still broken as infrastructure

**Evidence:** Production dashboard RCA (2026-11-01): `TypeError: fetch failed` / `getaddrinfo ENOTFOUND` on the Upstash host. `a6ddf74` + `28bed3d` catch cache/lock/quota errors so SSR does not hit `app/error.tsx`. That is an **application** mitigation. The host is not restored in this assignment.

**09-1 link:** Remaining risks — “Redis outage: live locks/dedup degrade” ([09-1 § Remaining risks](./09-1-final-audit.md)). RCA: dual scheduler + Redis as a single point of failure for jobs that still throw before fail-open.

**Next step (ops, needs approval):** Recreate/repair Upstash, rotate `UPSTASH_REDIS_REST_*`, confirm command volume vs plan. Fail-open stays as defense in depth.

---

## D4 — Stale `NS` after kickoff is still a large data hole

**Evidence:** Read-only SQL 2026-11-01: **1,207** fixtures with status `NS`/`TBD` and `kickoff_at` older than 3 hours. Newest provider sync on _some_ rows is current (`2026-11-01 12:42:51+00`), so this is incomplete coverage / time-budget, not a total ingest stop.

**09-1 link:** P1-2 (FT without events/stats) and the wider “competition expansion > ingestion depth” RCA. Fixtures plan **D2** already named this; VTS explicitly left it out of scope.

**User impact:** List can show not-started matches that already kicked off. Assignment UI can mark freshness stale / freeze live pulse; it cannot invent missing status updates.

**Next step:** Budgeted `sync-fixtures-today` follow-up (or a dedicated stale-NS pass) on Production data. Do not treat list empty-state work as a substitute.

---

## D5 — Live polling remains a configuration gate

**Evidence:** Code default `LIVE_POLLING_ENABLED=false` (09-2 documented; Production value was **unverified** in 09-1/09-2). `sync-live-center` / `reap-stale-locks` skip with HTTP 200 when off ([AI-INGESTION-RCA.md](../rca/AI-INGESTION-RCA.md) H2).

**09-1 link:** **P0-1** — live intelligence is production-viable only with polling on _and_ fresh provider sync.

**Next step:** Confirm the Production env value. If it must stay off (Hobby/quota), keep marketing live AI as conditional and keep skip logs as first-class ops signal — not “green cron”.

---

## Explicitly not listed as VTS bugs

- Warm-ai `ok: true` with Sentry `warm_ai_prematch_degraded` — RCA, pre-existing.
- Generic-baseline predictions blocking LLM narrative — product gate, not this assignment.
- Local `main` 49 commits behind `origin/main` — git hygiene after PR #8; fetch/ff when convenient.
- Unpushed `4ef623e` (sync CLI tsconfig) — tooling, not a user-facing deficiency.
