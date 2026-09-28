# System Audit Log

**Grana:** `fix/system-audit`  
**Okruženje za DB/code review:** dev Supabase (`user-supabasei`, ref `zovobemlpqoclyjhvkpw`)  
**GHA trigger target:** produkcija `https://scorence.app` (vidi `docs/ING-3-pro-cutover.md`)

---

## Faza 1 — Ingestion & Scheduling

**Datum:** 2026-09-27  
**Izvori:** `gh run list` / `gh run view <id> --log-failed`, `.github/workflows/ingestion-schedule.yml`, `vercel.json`, `docs/ING-3-pro-cutover.md`, dev Supabase SQL

### 1.1 Arhitektura (potvrđeno iz repoa)

| Sloj               | Uloga                                                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel Hobby**   | `vercel.json` — najviše **1× dnevno** po cron ruti (Hobby limit).                                                                                                                               |
| **GitHub Actions** | `ingestion-schedule.yml` — sub-daily pozivi ka **Production** (`PRODUCTION_SITE_URL` → default `https://scorence.app`) preko `scripts/trigger-production-cron.mjs` + repo secret `CRON_SECRET`. |
| **Matrix**         | `max-parallel: 1` (serijski triggeri); `fail-fast: false`, ali **ceo workflow je `failure` ako bilo koji matrix job padne**.                                                                    |
| **HTTP semantika** | `cronJobHttpStatus`: `ok: false` → **HTTP 500** (`lib/ingestion/cron-run.ts`); GHA tretira 500 kao pad job-a.                                                                                   |

**ING-3 napomena:** Runbook očekuje `sync-standings` na `0 */6 * * *` na Vercel Pro; u repou `vercel.json` i dalje ima `sync-standings` na `30 4 * * *` (dnevno). Sub-daily standings ide preko GHA — **nije bug sam po sebi na Hobby**, ali postoji **doc/config drift** prema ING-3 „after cutover“.

### 1.2 GHA health (poslednjih 25 run-ova)

```
gh run list --workflow=ingestion-schedule.yml --limit 25
→ 10 × failure, 15 × success (~40% failure rate)
```

| Cron raspored (UTC) | Tipični job-ovi u tom tiku                               | Posmatranje                                                                                                     |
| ------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `*/5 * * * *`       | `reap-stale-locks`, `reconcile-ai-usage`                 | Uzorak: **stabilni success** (npr. run `36319260650`).                                                          |
| `*/15 * * * *`      | lineups, warm imminent, live-center, sync-fixtures-today | **Mešovito** — često pad zbog `warm-ai-prematch?scope=imminent` dok ostali matrix job-ovi u istom run-u uspeju. |
| `0 */6 * * *`       | standings, warm daily                                    | **Visok udeo failure** — oba job-a redovno HTTP 500.                                                            |
| `0 3 * * *`         | sync-fixtures-future                                     | U poslednjih 25 run-ova **nije** bio uzrok failure (nema failed job-a sa tim id-jem).                           |

### 1.3 Root cause tabela (potkrepljena logovima)

| ID   | Job / ruta                          | Simptom u GHA                | Dokaz iz loga                                                                                                                                                                                                                                                                                                          | Root cause (potvrđeno)                                                                                                                                                                                                                                                                                                                     | Dev / prod                                                                                                                                                                                                                                                                                                                                                                                    |
| ---- | ----------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RC-1 | `warm-ai-prematch?scope=imminent`   | HTTP 500, 3 retry            | Run [`36321199335`](https://github.com/strale-dev/smart_sport/actions/runs/36321199335): `{"ok":false,"degraded":true,"job":"warm-ai-prematch","stats":{"scope":"imminent","candidates":12,"processed":12,"generated":0,"cached":4,"fallback":1,"unavailable":7,"errors":0}}`                                          | **Namerna „cron honesty“ (Phase 2):** `resolveCronOutcome` → `ok: false` kada `fallback + errors > 0` (`lib/ingestion/cron-outcome.ts`, `warm-ai-prematch.ts`). Nije mrežni kvar GHA; produkcioni endpoint vraća 500 jer bar jedna jedinica ide u `FALLBACK`. `unavailable` se ne broji u `failedCount`, ali `fallback:1` dovoljan za 500. | Log = **prod** (`scorence.app`). **Pretpostavka na osnovu dev okruženja — treba potvrda iz prod:** da li su isti fixture ID-jevi / isti udeo `FALLBACK`+`UNAVAILABLE` u Sentry/PostHog na prod.                                                                                                                                                                                               |
| RC-2 | `warm-ai-prematch?scope=daily`      | HTTP 500, run traje ~1–3 min | Run [`36316207882`](https://github.com/strale-dev/smart_sport/actions/runs/36316207882): `{"ok":false,"degraded":true,"stats":{"scope":"daily","candidates":40,"processed":22,"stoppedEarly":true,"generated":4,"cached":15,"fallback":3,"unavailable":0,"errors":0}}`                                                 | **Isti contract:** `fallback:3` + time budget (`stoppedEarly:true`) → i dalje `ok: false` jer `partialForTimeBudget` važi samo kada je `failed === 0`. Scheduler crveni iako je posao delimično uradio (cache/generate).                                                                                                                   | Log = **prod**. Dev warm nije ponovljen u ovoj sesiji — **pretpostavka na osnovu koda + prod loga**.                                                                                                                                                                                                                                                                                          |
| RC-3 | `sync-standings`                    | HTTP 500                     | Run [`36316207882`](https://github.com/strale-dev/smart_sport/actions/runs/36316207882) / [`36237348423`](https://github.com/strale-dev/smart_sport/actions/runs/36237348423): `{"ok":false,"job":"sync-standings","error":"Failed to resolve current season: JSON object requested, multiple (or no) rows returned"}` | **Data + query:** `getCurrentSeasonForLeague` koristi `.eq("is_current", true).maybeSingle()` (`lib/ingestion/upsert.ts`). Supabase vraća grešku kada ima **više redova** sa `is_current = true` za isti `league_id`.                                                                                                                      | **Dev Supabase (potvrđeno):** npr. Ligue 1 (`provider_id` 186) ima **16** sezona sa `is_current = true`; UCL (`provider_id` 2) **15** — isti obrazac bi lomio standings na bilo kom okruženju sa istim podacima. GHA log = **prod DB** na `scorence.app`; **pretpostavka da prod ima isti `is_current` haos — treba potvrda SQL-om na prod projektu** (ovaj audit nema MCP na prod Supabase). |
| RC-4 | Workflow signal vs. operativni kvar | Ceo run `failure`            | Run [`36321199335`](https://github.com/strale-dev/smart_sport/actions/runs/36321199335): uspešni `sync-live-center`, `sync-lineups`, `sync-fixtures-today`; jedini pad `warm-ai-prematch` imminent                                                                                                                     | **Observability / SLO dizajn:** jedan „soft“ AI degradacija failuje celu GHA matricu i maskira per-job zdravlje u GitHub UI. Ingestion fixture/lineups put može biti zelen po job-u ali run crven.                                                                                                                                         | N/A                                                                                                                                                                                                                                                                                                                                                                                           |

**Nije uočen u failed logovima (poslednjih 25 run-ova):** `CRON_SECRET` missing (401), client `AbortError` / 58s timeout na trigger skripti, ili `sync-fixtures-today` timeout — za te klase nema dokaza u `--log-failed` uzorku.

### 1.4 Šta radi (evidencija)

- GHA → prod auth radi: body odgovori (JSON), ne 401.
- `PRODUCTION_SITE_URL` prazan u logovima → fallback na `https://scorence.app` (očekivano).
- `*/5` maintenance cron-i (`reap-stale-locks`, `reconcile-ai-usage`) — success u pregledanom uzorku.
- U `*/15` tikovima: **lineups / live-center / sync-fixtures-today** su često **success** čak i kada warm padne (RC-4).

### 1.5 Implementacija (grana `fix/system-audit`, 2026-09-27)

| RC       | Status                  | Promene                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **RC-3** | Kod + migracija u repou | [`supabase/migrations/20260927180000_0036_seasons_single_current.sql`](supabase/migrations/20260927180000_0036_seasons_single_current.sql); [`lib/ingestion/upsert.ts`](lib/ingestion/upsert.ts) (`upsertSeason` clear-current, fixture ingest ne markira current); [`lib/ingestion/season-current-policy.ts`](lib/ingestion/season-current-policy.ts). **Dev/prod DB:** primeni migraciju na Supabase projekte (MCP apply nije prošao u agent sesiji — ručno `supabase db push` ili dashboard). |
| **RC-1** | Kod                     | [`lib/ai/merge-insight.ts`](lib/ai/merge-insight.ts) + [`lib/predictions/db.ts`](lib/predictions/db.ts) — `normalizeWinProbabilitiesWithFloor` pre Zod; test [`lib/ai/schemas.test.ts`](lib/ai/schemas.test.ts). Phase 2 strogi warm contract **zadržan**.                                                                                                                                                                                                                                       |
| **RC-2** | Kod                     | Isti AI fix kao RC-1; [`lib/ingestion/warm-ai-prematch.ts`](lib/ingestion/warm-ai-prematch.ts) `RUN_BUDGET_MS` 45s → 52s.                                                                                                                                                                                                                                                                                                                                                                        |
| **RC-4** | Kod                     | [`ingestion-ai-warm.yml`](.github/workflows/ingestion-ai-warm.yml) odvojen od [`ingestion-schedule.yml`](.github/workflows/ingestion-schedule.yml); [`scripts/pick-ingestion-gha-jobs.mjs`](scripts/pick-ingestion-gha-jobs.mjs).                                                                                                                                                                                                                                                                |

**Posle deploy-a:** `gh run list --workflow=ingestion-schedule.yml` vs `ingestion-ai-warm.yml`; potvrdi RC-3 na **prod** Supabase pre očekivanja zelenog standings job-a.

### 1.6 Otvoreno / za prod verifikaciju

- Tačan **API-Football quota** i Vercel cron execution history — **nema pristupa u ovoj sesiji** (Vercel dashboard); **pretpostavka na osnovu dev okruženja — treba potvrda iz prod**.
- Da li **dnevni** Vercel `sync-standings` (`30 4 * * *`) takođe pada sa RC-3 — **verovatno da** (isti kod + prod DB), ali **nije u GHA uzorku**; proveriti Vercel cron log.

---

## Faza 2 — AI Analysis Lifecycle

(popuniti)

## Faza 3 — AI Prediction Correctness

(popuniti)

## Faza 4 — Expected Goals

(popuniti)

## Faza 5 — Match Page Frontend

(popuniti)

## Faza 6 — Performance

(popuniti)

## Faza 7 — Error Handling & Observability

(popuniti)

## Faza 8 — Testing

(popuniti)

## Faza 9 — Backward Compatibility & Production Readiness

(popuniti)
