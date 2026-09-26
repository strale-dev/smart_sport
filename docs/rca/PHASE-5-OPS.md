# RCA Phase 5 — Ops: PREMATCH coverage SLO (2026-09-26)

Operational runbook output for bringing **production** PREMATCH AI coverage to a measurable SLO. Phase 1–4 code is on `main`; this document records what was verified, what was run, and what remains.

---

## 1. Git & deploy

| Check                      | Result                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Local `main`               | `cc2ea866898d935e820cf7db197cf62d103e408e`                                                                              |
| `origin/main`              | Same SHA (already pushed)                                                                                               |
| `scorence.app` cron probes | `/api/cron/*` → **401** without auth (routes live)                                                                      |
| Vercel git SHA header      | Not exposed on homepage (only `X-Vercel-Id`)                                                                            |
| GitHub `main` tip          | Matches `cc2ea86` ([commit](https://github.com/strale-dev/smart_sport/commit/cc2ea866898d935e820cf7db197cf62d103e408e)) |

**Assumption:** Production app is deployed from current `main` (no drift detected via git). Confirm in Vercel → Deployments if you need the exact deployment ID.

---

## 2. Cron health (read-only)

| Source                                   | Result                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GHA `Ingestion schedule`**             | `gh` CLI not available locally; GitHub MCP has no Actions run listing. **Manual:** [Actions → Ingestion schedule](https://github.com/strale-dev/smart_sport/actions/workflows/ingestion-schedule.yml) — expect `warm-ai-prematch` every 15m (imminent), `warm-ai-prematch-daily` every 6h, `sync-fixtures-today` every 15m.         |
| **PostHog `ingestion_cron_completed`**   | Event not present in connected PostHog project taxonomy (likely not yet observed in this project or prod analytics env mismatch).                                                                                                                                                                                                   |
| **Supabase prod logs (`user-supabase`)** | `edge_logs` count **0** in last 24h — log drain to Supabase likely not configured for prod, or Vercel logs not linked. **Not usable for cron proof on prod.**                                                                                                                                                                       |
| **Sentry (prod)**                        | Recent cron-side issues: [prematch_insight_unavailable](https://scorence.sentry.io/issues/JAVASCRIPT-NEXTJS-H) (91 events), [prematch_insight_fallback](https://scorence.sentry.io/issues/JAVASCRIPT-NEXTJS-K), [warm_ai_prematch_degraded](https://scorence.sentry.io/issues/JAVASCRIPT-NEXTJS-J) — last seen ~7h before this run. |

### Catch-up triggers (not executed)

- **`CRON_SECRET`** is **not** in local `.env.local` → `scripts/trigger-production-cron.mjs` cannot be run safely from this workspace without adding the secret (must match Vercel Production).
- Recommended one-shot (after secret is set), `PRODUCTION_SITE_URL=https://scorence.app`:
  1. `node scripts/trigger-production-cron.mjs /api/cron/sync-fixtures-today`
  2. `node scripts/trigger-production-cron.mjs "/api/cron/warm-ai-prematch?scope=daily"`
  3. Repeat warm daily until SLO stable (avoid firing all crons at once).

---

## 3. Coverage metrics (Postgres)

### Production DB (`rqmwefmlbhvufdhnoief` — MCP `user-supabase`)

**All `execute_sql` calls failed** with connection timeout (including `select 1`). **Prod coverage numbers could not be collected via MCP.**

Use one of:

- Vercel Production env + `npm run rca:phase4:verify` with **`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` pointing at prod** (today `.env.local` points at **dev**), or
- Supabase Dashboard SQL on prod project.

### Dev DB (`zovobemlpqoclyjhvkpw` — MCP `user-supabasei`) — reference only

Scorence **dev** is **not** production, but it mirrors pipeline behavior and was used for scripted warm/sync during this ops pass.

| Metric                                      | Before ops (Phase 4 report) | After `sync:fixtures-today` + 2× `sync:warm-ai-prematch --scope=daily` |
| ------------------------------------------- | --------------------------: | ---------------------------------------------------------------------: |
| Upcoming 7d (NS/TBD)                        |                         201 |                                                                **184** |
| `aiEligible` upcoming (7d)                  |                          51 |                                                                 **36** |
| Upcoming with PREMATCH `ai_insights` (any)  |                           9 |                                                                  **5** |
| **SLO: eligible ∩ insight / eligible (7d)** |               ~17.6% (9/51) |                                                      **~11.1% (4/36)** |

**36h warm window vs 7d SLO:** Daily warm uses a **36h** kickoff window (`warmWindowBoundsForScope("daily")`). For this snapshot, all 7d-eligible fixtures fell inside 36h (`eligible_7d` = `eligible_36h` = 36), so window mismatch did not explain the gap **today** — but it will for fuller calendars.

**Warm stats (dev, this session):**

| Run           | processed | generated | cached | fallback | stoppedEarly      |
| ------------- | --------: | --------: | -----: | -------: | ----------------- |
| warm daily #1 |         8 |         2 |      3 |        3 | yes (~45s budget) |
| warm daily #2 |         5 |         4 |      0 |        1 | yes               |

**Dominant failure mode:** `ZodError` — _"Each win probability must be at least 1%"_ → `FALLBACK` / degraded warm (`ok: false`, `degraded: true`), not a stored full narrative.

**`sync:fixtures-today` (dev):** `ok: true`, `degraded: true`, 119 fixtures upserted, readiness refreshed, stopped for time budget.

---

## 4. UI verification (production HTTP)

Prematch API requires auth: `GET https://scorence.app/api/ai/prematch/{id}` → **403 `GUEST_FORBIDDEN`** (expected).

| Provider ID | Dev DB role (samples)                        | Prod match page                                                                                     |
| ----------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **1563768** | aiEligible, **has** PREMATCH insight         | **200** — page HTML contains AI-related copy                                                        |
| **1640504** | aiEligible, **has** insight (from warm list) | (not re-fetched; same pipeline as 1563768)                                                          |
| **1520898** | aiEligible, **no** insight                   | **200** — HTML still hints AI strings (guest sees tier messaging / model shell, not full narrative) |
| **1563767** | aiEligible, **no** insight                   | Use for logged-in **MISS → generating** path                                                        |
| **1490503** | aiEligible **null**, has insight (edge)      | Ineligible / scheduled tier behavior                                                                |

**Logged-in flow (expected from code, not executed here):**

- `AIInsightProvider`: guest → no prematch GET; user → GET `/api/ai/prematch/[fixtureId]`.
- Response **`OK`** → hook state **`ok`**, narrative tier `narrative_ready`.
- Response **`MISS`** + prediction → **`generating`** + auto POST generate when eligible.
- Response **`FALLBACK`** → **`fallback`** (probabilities only — matches user report of “missing AI” on many matches).

---

## 5. Recommended SLO

| SLO                             |                                                   Target | Measurement                                                                                                                |
| ------------------------------- | -------------------------------------------------------: | -------------------------------------------------------------------------------------------------------------------------- |
| **Prematch narrative coverage** |                                                **≥ 80%** | `count(eligible upcoming 7d with PREMATCH insight status OK)` / `count(aiEligible upcoming 7d)` on **production** Postgres |
| **Cron freshness**              |                  **≥ 95%** successful GHA triggers / 24h | GitHub Actions + optional PostHog `ingestion_cron_completed`                                                               |
| **Degraded warm rate**          | **< 10%** fixture units fallback+unavailable / processed | Cron JSON stats + Sentry `warm_ai_prematch_degraded`                                                                       |

**Current status:** **Operational end not reached.** Gate `npm run rca:phase4:check` **passes** (route probes + no stuck sync on **dev-linked** verify DB), but **coverage SLO is far below 80%** and prod DB was not measurable from this environment.

---

## 6. Phase 5 tuning — concrete PR ideas (no architecture rewrite)

1. **Win probability floor before Zod** — Clamp or normalize model `winProbabilities` to ≥1% before `validateAIInsightPayload` (or relax schema with explicit floor in one place). Stops warm churn into `FALLBACK` without narrative rows.
2. **Warm run budget vs GHA timeout** — Raise `RUN_BUDGET_MS` from 45s toward **55s** (58s client cap in `trigger-production-cron.mjs`) and/or **resume cursor** across consecutive daily runs so 40 candidates aren’t abandoned after ~5–8 LLM calls.
3. **Align warm window with product SLO** — Extend daily warm kickoff horizon toward **7d** (or tiered: daily 36h + 6h job for 7d eligible backlog) so fixtures day 2–7 get warmed before users open them.
4. **`rca:phase4:verify` prod honesty** — Require explicit `PRODUCTION_SUPABASE_*` (or Vercel-pulled env) and print project ref in report header; never label dev metrics as “Production verification” without ref.
5. **SLO metric in cron output** — Log `eligible_insight_ratio_7d` in warm completion stats / PostHog for dashboarding.
6. **Optional:** Count **`FALLBACK`** as partial coverage in product UI copy vs SLO (product decision); SLO should still track full **`OK`** narratives separately.

---

## 7. Commands run this session

```text
npm.cmd run sync:fixtures-today          # dev DB (.env.local)
npm.cmd run sync:warm-ai-prematch -- --scope=daily   # ×2, dev DB
npm.cmd run rca:phase4:check             # PASS (strict verify writes PHASE-4 report)
```

---

## 8. Verdict

| Question                            | Answer                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Is **operational SLO end** reached? | **No** — narrative coverage ~11–18% on measurable dev DB; prod DB unreachable via MCP; user-visible gaps remain (fallback + miss + guest). |
| Is **Phase 5 tuning** needed?       | **Yes** — prioritize validation/clamp, warm budget/window, and prod verify wiring (§6).                                                    |
| Does **`rca:phase4:check` pass?     | **Yes** (2026-09-26 ops session).                                                                                                          |

Update this file after prod SQL access, GHA run review, and production catch-up crons.
