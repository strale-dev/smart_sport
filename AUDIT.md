# System Audit Log

**Grana:** `fix/system-audit`  
**Supabase (smart_sport / Scorence):** MCP **`user-supabasei`** only (ref `zovobemlpqoclyjhvkpw`). Ne koristiti `user-supabase` — drugi projekat.  
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

### 1.5 Implementacija (grana `fix/system-audit`)

| RC       | Status implementacije                                 | Verifikacija (2026-09-28)                                                                                                                                                                                                  | Promene                                                                                                                                                                                                                              |
| -------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **RC-3** | Kod + migracija u repou; **dev DB primenjeno**        | Dev SQL: nema `league_id` sa `count(is_current=true) > 1`; index `seasons_one_current_per_league_idx` postoji. **Prod: čeka operatora** (checklist §1.7).                                                                  | [`20260927180000_0036_seasons_single_current.sql`](supabase/migrations/20260927180000_0036_seasons_single_current.sql); [`upsert.ts`](lib/ingestion/upsert.ts); [`season-current-policy.ts`](lib/ingestion/season-current-policy.ts) |
| **RC-1** | Kod (Zod floor); **nije dokazano rešenje na prod**    | GHA [`36321199335`](https://github.com/strale-dev/smart_sport/actions/runs/36321199335): agregat `fallback:1`, `unavailable:7` — **bez per-fixture razloga u logu**. Posle merge+deploy: `ingestion-ai-warm.yml` + Sentry. | [`merge-insight.ts`](lib/ai/merge-insight.ts), [`predictions/db.ts`](lib/predictions/db.ts), [`schemas.test.ts`](lib/ai/schemas.test.ts)                                                                                             |
| **RC-2** | Kod (isti AI fix + budget); **nije dokazano na prod** | GHA [`36316207882`](https://github.com/strale-dev/smart_sport/actions/runs/36316207882): `fallback:3`, `stoppedEarly:true` — **bez per-fixture razloga**.                                                                  | [`warm-ai-prematch.ts`](lib/ingestion/warm-ai-prematch.ts) `RUN_BUDGET_MS` 52s                                                                                                                                                       |
| **RC-4** | Kod                                                   | PR [#1](https://github.com/strale-dev/smart_sport/pull/1); GitHub **ci** pass; warm izdvojen u [`ingestion-ai-warm.yml`](.github/workflows/ingestion-ai-warm.yml).                                                         | [`pick-ingestion-gha-jobs.mjs`](scripts/pick-ingestion-gha-jobs.mjs)                                                                                                                                                                 |

**PR:** https://github.com/strale-dev/smart_sport/pull/1 (`fix/system-audit` → `main`). **Obavezno pre deploy-a aplikacije na prod:** migracija 0036 na prod Supabase.

**Lokalno (sesija 2026-09-28):** `npm run typecheck` OK; pre-push hook vitest **684/684**; working tree clean posle `git clean -fd` — nema missing importa (`openai-config`, `utils/supabase` nisu referencirani; Supabase preko `@/lib/supabase/*`).

**Git repack:** obrisana ref `fix/production-stability-audit - Copy`. Geometric repack i dalje prijavljuje **`refs/heads/main - Copy`** (broken name) pri commit hook-u — commit ipak prolazi; ručno: `git update-ref -d "refs/heads/main - Copy"` ako ref postoji u `.git/refs/heads/`.

### 1.6 RC-1 / RC-2 — šta GHA logovi **jesu** i **nisu** dokazali

GHA `trigger-production-cron.mjs` ispisuje samo **JSON agregat** sa produkcije, ne Vercel function log po utakmici.

| Run         | Job           | Telo odgovora (suština)                                                | Zašto HTTP 500                                                                                                           |
| ----------- | ------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 36321199335 | warm imminent | 12 processed; cached 4; **fallback 1**; **unavailable 7**; generated 0 | `failedCount = fallback + errors` → 1 ≥ 1 → `ok: false` (`cron-outcome.ts`). `unavailable` **ne** ulazi u `failedCount`. |
| 36316207882 | warm daily    | 22 processed; cached 15; generated 4; **fallback 3**; stoppedEarly     | Isto: 3 fallback → 500; `partialForTimeBudget` ne pomaže dok ima fallback.                                               |

**Per-fixture uzrok iz ovih logova: nije moguće.** Kod mapiranja (`warm-ai-prematch.ts` + `generatePrematchInsight`):

- **FALLBACK** — izuzetak u LLM/validate/merge putu (`catch` u `aiService.ts` → `buildFallbackResponse`); tipično Zod, timeout, OpenAI greška (ne piše se u GHA body).
- **UNAVAILABLE** — poslovna blokada: `FIXTURE_NOT_ANALYZABLE`, `GENERATION_NOT_ALLOWED`, nedostaje `inputSnapshot` / `canGeneratePrematchNarrative` (`aiService.ts`); warm loguje `logIngestionEvent` sa `reason` **samo u prod telemetry**, ne u GHA.

**Zaključak:** RC-1/RC-2 fix u grani **smanjuje verovatnoću** Zod fallback-a i daje više vremena daily warm-u; **nisu verifikovani rešeni** dok posle deploy-a `ingestion-ai-warm` i Sentry/PostHog (`prematch_insight_fallback`, `prematch_insight_unavailable`, `warm_ai_prematch` fixture_unit) ne pokažu pad.

**Predlog istraživanja posle deploy-a:**

1. Sentry issue grupe K/H/J iz [`docs/rca/AI-INGESTION-RCA.md`](docs/rca/AI-INGESTION-RCA.md) filtrirati na `trigger:cron` i vremenski prozor warm run-a.
2. PostHog / ingestion eventi: `job_name=warm-ai-prematch`, `stage=fixture_unit`, polja `error_type`, `detail.reason`.
3. Za `unavailable:7` na imminent — uzorak fixture ID-jeva iz telemetry; proveriti prematch readiness / `inputSnapshot` na prod DB.

### 1.7 Prod checklist — migracija 0036 (operator)

**Pre migracije (read-only):**

```sql
-- A) Koliko liga ima više od jedne "current" sezone?
SELECT league_id, count(*) AS n
FROM public.seasons
WHERE is_current = true
GROUP BY league_id
HAVING count(*) > 1
ORDER BY n DESC;

-- B) Pregled po ligi (provider_id za ljudski read)
SELECT l.provider_id AS league_provider_id, l.name, s.year, s.is_current
FROM public.seasons s
JOIN public.leagues l ON l.id = s.league_id
WHERE s.is_current = true
ORDER BY l.provider_id, s.year DESC;

-- C) Da li index već postoji?
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'seasons'
  AND indexname = 'seasons_one_current_per_league_idx';
```

**Šta proveriti pre RUN:**

| Rezultat A      | Akcija                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Prazno          | Data već konzistentna; migracija i dalje bezbedna (idempotent repair + `IF NOT EXISTS` index).                                       |
| Redovi          | Očekivano pre fix-a; migracija normalizuje na **max(year)** po `league_id`. Proveri B da nema očigledno pogrešne `year` za top lige. |
| C index postoji | `CREATE UNIQUE INDEX IF NOT EXISTS` preskače kreiranje.                                                                              |

**Migracija (sadržaj 0036 — pokrenuti kao jedna transakcija u SQL editoru):**

```sql
update public.seasons
set is_current = false
where is_current = true;

update public.seasons s
set is_current = true
from (
  select league_id, max(year) as max_year
  from public.seasons
  group by league_id
) canonical
where s.league_id = canonical.league_id
  and s.year = canonical.max_year;

create unique index if not exists seasons_one_current_per_league_idx
  on public.seasons (league_id)
  where is_current = true;
```

**Posle migracije:**

```sql
SELECT league_id, count(*) AS n
FROM public.seasons
WHERE is_current = true
GROUP BY league_id
HAVING count(*) > 1;
-- mora biti prazno
```

**Redosled operacija:** (1) prod SQL migracija → (2) merge PR → (3) deploy app → (4) GHA standings tick / ručni `sync-standings` cron.

### 1.8 Otvoreno / doc drift / CI

- **Doc drift ING-3 vs `vercel.json`:** runbook/Tech očekuju `sync-standings` na `0 */6 * * *` (Pro); repo [`vercel.json`](vercel.json) i dalje **`30 4 * * *`** (Hobby dnevno). Sub-daily standings ostaje na GHA — namerno do Pro cutover-a; uskladiti config ili dokumentaciju u posebnoj odluci.
- **API-Football quota / Vercel cron history** — nema dashboard pristupa u audit sesiji.
- **PR CI (2026-09-28):** GitHub Actions **ci** pass (~1m42s); **Vercel** preview deploy fail — vidi Vercel log (`dpl_5r7dcdgJokxD4kpCZ7UWJez1gXVX`); nije blokirajuće za merge ako je poznati env/integracioni problem (ne menjan kod bez odobrenja).
- **Faza 2+** — ne počinjati dok prod migracija 0036 nije primenjena i PR nije merge-ovan.

---

## Faza 2 — AI Analysis Lifecycle

(popuniti)

### 2.7 Prod incident (2026-09-30) — dijagnoza, nije nova Phase 2 regresija

| Signal                       | Zaključak                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GHA posle deploy-a `5088f69` | **Zelen** (`ingestion-schedule` / `ingestion-ai-warm` success); poslednji failure pre PR #2 stack-a (`36416509310`, 2026-09-28).                                                                                                                                                                                                        |
| Phase 2 u prod               | **Da** — PR #2 + deploy `5088f69` (Sentry release).                                                                                                                                                                                                                                                                                     |
| Uzrok simptoma               | **Stari ops obrazac:** multi-cron GHA kasni satima → `sync-lineups` / warm imminent promašuju 90-min prozor; Friendlies (`providerId` 10) imao probe `lineups: false`; live reconcile finalizovao DB live kad je provider tick vratio 0 allowlisted live; warm daily lock TTL 600s + paralelni 6h job-ovi.                              |
| Fix (2026-09-30)             | Split GHA workflow-i + `ingestion-cadence-watchdog.yml`; override/probe `lineups: true` za liga 10; runtime `applyCompetitionOverride` u `findCompetition`; reconcile ne tretira prazan active live set kao „nema live”; warm lock TTL 90s (60s maxDuration + 30s buffer); 6h warm sequential batch script; reconcile FT scenario test. |

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
