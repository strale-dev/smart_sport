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

**Datum:** 2026-09-28
**Izvori:** dev Supabase (`user-supabasei`, ref `zovobemlpqoclyjhvkpw`) SQL uzorak posle 2026-09-14; kod pod `lib/ai/*`, `lib/services/aiService.ts`, `lib/services/aiContextService.ts`, `lib/services/predictionService.ts`, `lib/ingestion/warm-ai-prematch.ts`, `app/api/ai/prematch/[fixtureId]/route.ts`, `components/ai/*`.

### 2.1 Lifecycle (potvrđeno iz repoa)

```
Fixture (fixtures.status ∈ NS/TBD/LIVE/FT/…)
  → cron sync (Faza 1) puni fixtures/lineups/standings
  → prematch_readiness snapshot (aiEligible = hasMinimumModelSignal)
  → warm-ai-prematch (imminent ≤25 / daily ≤40) — samo status ∈ (NS,TBD)
  → generatePrematchInsight (aiService.ts)
       ├─ gate: canGeneratePrematchNarrative(snapshot, prediction)
       ├─ buildPrematchContext (aiContextService.ts)  ← context_hash
       ├─ readPrematchInsightFromStore(fixtureUuid, contextHash) ← Redis→DB
       └─ OpenAI structured output → Zod → mergeNarrativeWithPrediction → insertAiInsight
  → GET /api/ai/prematch/[fixtureId] → readPrematchInsight (exact context_hash)
       └─ post-kickoff: readHistoricalPrematchInsight (readLatestPrematchInsight bez hash-a)
  → AIInsightProvider (React Query) → mapPrematchInsightResponseToViewModel
  → resolvePrematchDisplayExperience → AIHeroSection / AIHeroDetailedPanel
```

### 2.2 Health iz dev DB (2026-09-14 → 2026-09-28)

| Metric                                                               | Vrednost                         |
| -------------------------------------------------------------------- | -------------------------------- |
| `ai_insights` (PREMATCH) rows                                        | **189**                          |
| Distinct fixtures with any PREMATCH insight                          | **170**                          |
| Fixtures u prozoru sa insight-om                                     | **161**                          |
| **Finished fixtures BEZ insight-a** (14d)                            | **1339**                         |
| Upcoming ≤36h BEZ insight-a                                          | **75**                           |
| Live BEZ insight-a                                                   | **4**                            |
| Insight rows sa "orphan" `prediction_id` (FK ne postoji)             | **0**                            |
| Fixtures gde `readLatestPrematchPrediction` vraća null a insight ima | **0**                            |
| Fixtures sa ≥2 distinct `context_hash` PREMATCH insight-a            | **17** (max 4× za jedan fixture) |

**Coverage:** ~10% odigranih mečeva iz poslednjih 14 dana ima ijednu stored pre-match analizu. Warm-daily cap (40) < upcoming-in-36h (≥75) na busy dane — struktura garantuje coverage gap.

### 2.3 Root cause tabela

| ID        | Problem                                                                                                                                                                                                                                                                                                                                                                                                          | Root cause                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Dokaz                                                                                                                                                                                                                                                                                                                                                                                                              | Uticaj                                                                                                                                                                                                                                                                                                                                                                                    | Fix                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RC-5**  | **Cron nikad ne backfilluje analizu posle kickoff-a.** Ogromna većina odigranih mečeva ostaje bez ijedne stored AI analize.                                                                                                                                                                                                                                                                                      | (a) `warm-ai-prematch` bira samo `.in("status", ["NS","TBD"])` — postmatch fixtures se ne razmatraju. (b) `historicalPrematchWriteAction({trigger:"cron", hasStoredPrematch:false})` vraća `generation_not_allowed`, pa i da warm pošalje LIVE/FINISHED fixture, `generatePrematchInsight` odbija.                                                                                                                                                                                                                                              | Kod: [`lib/ingestion/warm-ai-prematch.ts:65`](lib/ingestion/warm-ai-prematch.ts), [`lib/ai/status-map.ts:62-80`](lib/ai/status-map.ts). DB: 1339 FT/AET/PEN fixtures bez insight-a u 14 dana; 170 sa vs. ~1500 ukupno.                                                                                                                                                                                             | Za sve fixtures koje nisu bile otvorene od potpisanog korisnika u prematch prozoru: UI vidi `MISS + prediction` → auto-generate POST → `UNAVAILABLE:GENERATION_NOT_ALLOWED` (post-kickoff, guest se ne broji) → `AIHeroUnavailableState` "Pre-match analysis unavailable". User percipira "No analysis available" gde generacija nikad nije ni pokušana.                                  | (a) Cron-only backfill scope: proširiti `warm-ai-prematch` (ili odvojen job) da uključi FINISHED/LIVE bez stored insight-a, i (b) dozvoliti `historicalPrematchWriteAction` da vrati `backfill` za `trigger:"cron"` kad `!hasStoredPrematch` (jedna analiza per fixture, ograničena budžetom). Alternativa: eksplicitno pomeriti UX iz `unavailable` u trajno "model_only" za fixtures bez insight-a. |
| **RC-6**  | **Pre-match cache miss pri promeni context_hash u poslednjem satu.** Ako se lineups confirm-uju, standings osveže ili prediction re-računa 30–90 min pre kickoff-a, `readPrematchInsight` vraća `MISS` iako 1–3 valid analize već postoje u DB.                                                                                                                                                                  | `readPrematchInsight` (`aiService.ts:245-269`) za phase `PREMATCH` čita **samo tačan** `contextHash` (`readPrematchInsightFromStore`). Ne pravi fallback na `readLatestPrematchInsight` (koji se koristi tek u `readHistoricalPrematchInsight` za LIVE/FINISHED). Context hash uključuje `lineupsState`, `lineups`, `sidelined`, `standings`, `form.*` (deo prediction snapshot-a), `prediction.winProbabilities` (`aiContextService.ts:295-321`).                                                                                              | Kod: cited above. DB: fixture `d41b4c5a-…` ima 4 distinct `context_hash` insight-a generisana u razmaku 11h — svaka promena je izazvala novi LLM poziv umesto reuse-a. 17 fixtures sa ≥2 distinct hashes u 14 dana.                                                                                                                                                                                                | Front-end auto-generate triggeruje POST; ako OpenAI failuje (Zod, timeout, refusal), UI dobija `FALLBACK` ili `UNAVAILABLE` iako je stara valid analiza u DB. Bespotrebno trošenje OpenAI kredita (~ 2–4× per fixture).                                                                                                                                                                   | U `readPrematchInsight` za PREMATCH phase: ako exact-hash miss, vratiti `readLatestPrematchInsight` sa `insightMode: "prematch"` + staleness flag (novi field `contextStale: true`) da UI zna da prikaže poslednju verziju. Optional: iz hash-a izbaciti komponente koje se stalno menjaju (npr. standings) ili ih grupovati u coarse "revision" broj.                                                |
| **RC-7**  | **`UNAVAILABLE:NO_STORED_INSIGHT` se vraća kada stored postoji ali prediction row nedostaje** — UI prikazuje "no stored analysis" iako je narrative validan u DB.                                                                                                                                                                                                                                                | `readHistoricalPrematchInsight` (`aiService.ts:118-148`): kada `row = readLatestPrematchInsight(...)` postoji ali `prediction = getLatestPrematch(...)` je null, funkcija vraća `{status:"UNAVAILABLE", reason:"NO_STORED_INSIGHT"}` — reason ne odgovara činjenici. UI (`AIHeroUnavailableState`) hardkoduje copy "We do not have a stored pre-match AI analysis for this fixture."                                                                                                                                                            | Kod: cited above; [`components/ai/AIHeroUnavailableState.tsx:13`](components/ai/AIHeroUnavailableState.tsx). DB (dev): trenutno 0 slučajeva — svih 170 fixtures ima paran `getLatestPrematch`. **Bug latentan**, aktivira se ako PREMATCH prediction bude obrisana (retention/cleanup) ili ako se insight backfilluje bez prediction-a.                                                                            | Latentno; ali kada okine, korisnik ne vidi analizu koja fizički postoji, i AI tab prikazuje "Detailed analysis not ready yet".                                                                                                                                                                                                                                                            | Ako `row` postoji: vratiti `OK` sa `prediction: null` i pusti UI da sakrije samo prediction-strip (WinProbabilitiesBar, xG range); commentary/analysis sekcije ostaju vidljive. Alternativno preimenovati reason u `PREDICTION_MISSING` i uskladiti UI copy.                                                                                                                                          |
| **RC-8**  | **AI prompt dobija znatno manje istorijskih signala nego što je izračunato.** `historicalContextFromAggregates` mapira samo `last20Ppg`, `seasonPpg`, `previousSeasonPpg`, top-5 competitions; sve ostalo (last10 splits, W/D/L, GF/GA per period) se odbacuje. xG averages (`homeXgForAvg/awayXgForAvg`), rest days, injury impact skorovi — nikad ne stižu u JSON prompt iako su u `prediction.inputSnapshot`. | `lib/services/aiContextService.ts:58-71` (`historicalContextFromAggregates` slice); `lib/services/aiContextService.ts:214-292` (context assembly). `lib/analytics/team-aggregates.ts:243-260` (aggregates return svo: last5/10/20 All/Home/Away + season + prev season + byCompetition). `lib/models/features.ts:243-295` (feature vector ima xG/rest/injury). Prompt (`lib/ai/prompts.ts:14`) traži "concrete numbers from the context JSON (form W-D-L, ppg, goals, standings rank/points, H2H counts…)" — što bi popunio ako context izloži. | LLM analizira sa uzorkom od poslednjih 5 mečeva (form.*Last5), 10 H2H (window fiksan, [`aiContextService.ts:139`](lib/services/aiContextService.ts)) i grubim PPG-om za last20. Bez xG/rest/injury signala mora "guessovati". Povećava rizik od Zod validation failure-a (evidence bez digit-a → repairInsightNarrativeEvidence pokušava fallback, ali može promašiti) i generalno svede analizu na 3-mečna trend. | Proširiti `PrematchAiContext.historicalContext` sa `last10All`, `last10Home`, `last10Away` (već postoje u aggregates), plus dedicated blok `predictionFeatures: { homeXgForAvg, awayXgForAvg, homeRestDays, awayRestDays, homeInjuryImpact, awayInjuryImpact, standingPointsDiff }` iz `prediction.inputSnapshot`. Ažurirati `contextHash` inputs i prompt guidance (nabroji nova polja). |
| **RC-9**  | **Warm-ai-prematch capacitet je ograničen na 40 daily / 25 imminent po tick-u.** Dan sa >40 fixtures u 36h prozoru garantovano ostavlja rupu; ostali se oslanjaju na korisnički POST.                                                                                                                                                                                                                            | `RUN_BUDGET_MS=52_000`, `DAILY_MAX_FIXTURES=40`, `IMMINENT_MAX_FIXTURES=25` ([`warm-ai-prematch.ts:11-13`](lib/ingestion/warm-ai-prematch.ts)); sort po `(aiEligible desc, kickoffAt asc)`, prekid na `RUN_BUDGET_MS`. GHA scheduler `0 */6 * * *` (daily) i `*/15 * * * *` (imminent) — ne kompenzuje limit u ravni cap-a jer isti cap važi svaki tick.                                                                                                                                                                                        | DB: 75 upcoming≤36h bez insight-a (uz 161 sa). Na svetske vikende brojka bi bila veća. Vidi Fazu 1 RC-2: 22 processed za daily je normalno kod time-budget-a.                                                                                                                                                                                                                                                      | Front-end vidi `MISS` do prvog user open-a; users u prvom open-u čekaju 20–40s LLM latency. Kombinovano sa RC-6 lako da svaki open triggeruje regen.                                                                                                                                                                                                                                      | (a) Podići `DAILY_MAX_FIXTURES` (ili ga skalirati sa brojem fixture-a); (b) uvesti persistent queue (npr. `ai_generation_queue` tabela) i workove — svaki `*/15` tick uzima N iz queue-a. Uskladiti sa ING-3 Pro cutover.                                                                                                                                                                             |
| **RC-10** | **Verifikacija: nema cross-fixture / prediction_id ↔ fixture_id mismatch-a.**                                                                                                                                                                                                                                                                                                                                    | GET fetch cache u [`lib/ai/prematch-insight-fetch.ts`](lib/ai/prematch-insight-fetch.ts) ključuje se strogo po `fixtureId`; `AIInsightProvider` key uključuje `fixture.externalId`; DB `ai_insights.prediction_id` je FK — 0 orphan rows u dev. `contextHash` = `sha256` `stableStringify` sa `fixtureExternalId` u inputu. Race conditions unutar `withPrematchInsightLock` obrađene retry-em kada `LockNotAcquiredError`.                                                                                                                     | Kod cited; DB queries iznad.                                                                                                                                                                                                                                                                                                                                                                                       | **Nije bug** — dokumentovano da nije uzrok "wrong prediction on wrong match" izveštaja.                                                                                                                                                                                                                                                                                                   | N/A. Zadržati; regres testovi u planu Task 2 potvrđuju invariant.                                                                                                                                                                                                                                                                                                                                     |
| **RC-11** | **Front-end race: MISS → auto-generate se pokreće samo jednom po mount-u.** Ako user preload-uje stranicu dok fixture još ne prolazi eligibility gate, single-shot auto-generate izostane; nakon što gate prođe, komponenta i dalje pokazuje "generating"/"unavailable" dok se ne desi hard reload.                                                                                                              | `AIInsightProvider` (`ensureAttemptedRef.current`) fired jednom; auto-generate zavisi od `displayExperience.shouldAutoGenerateNarrative` koji zahteva `inLlmWindow && modelIsSpecific`. Kada se `prediction.inputSnapshot` osveži (pošto se popuni h2h/standings), `displayExperience` reaguje samo na promenu React Query keša. Refetch ne resetuje `ensureAttemptedRef` — ali `refetch()` u callback-u resetuje eksplicitno.                                                                                                                  | Kod: [`components/ai/AIInsightProvider.tsx:96, 280, 373-384`](components/ai/AIInsightProvider.tsx).                                                                                                                                                                                                                                                                                                                | Marginalno, ali može uzrokovati "no analysis" iako je backend spreman — user mora F5 ili kliknuti "Generate".                                                                                                                                                                                                                                                                             | Automatski `refetch()` (koji resetuje ref) kad se `displayExperience.shouldAutoGenerateNarrative` promeni iz `false → true`; ili resetovati `ensureAttemptedRef` u `useEffect` kada se ključni ulazi promene.                                                                                                                                                                                         |

**Nije uočen problem:**

- Zod schema za `AIInsightSchema` i `prematchAnalysisSchema` — koristi `.nullable()` gde treba, ima `superRefine` za sanity (probabilities sum, expectedGoalsRange min≤max, winOutcome usklađen sa max prob).
- Prompt drift: `PROMPT_VERSION` uzet iz env-a (`AI_PROMPT_VERSION`, default `1.2.0`) i deo `context.promptVersion` → deo `context_hash`. Promena verzije invalidira sav pre-match keš (željeno).
- Cache correctness: jedna PREMATCH ROW po `(fixture_id, context_hash)` (`readInsightByContextHash`), Redis TTL 86400s (default), lock ograničen na `withPrematchInsightLock` sa dupla-provera keša unutar lock-a.
- Coverage per liga: **NEMA hard whitelist-a** liga u AI putu; `resolveMatchFixtureContext` samo bira `supportsStandings` (utiče na context, ne blokira gen). AI eligibility se određuje čisto po `hasMinimumModelSignal(features)`.

### 2.4 Otvorena pitanja / follow-up

- **Prod verifikacija sve gore.** Dev SQL brojevi su indikativni; prod (`scorence.app` Supabase) treba potvrditi sa istim setom SELECT-ova (audit sesija nema prod MCP).
- **PostHog / Sentry telemetry**: `prematch_insight_unavailable`/`_fallback` eventi bi dali per-fixture razlog (missing input_snapshot vs. GENERATION_NOT_ALLOWED vs. Zod fallback). Uzeti u obzir za Task 2 dashboard.
- **Ne diramo u ovoj fazi (per user):** live prediction logika, Expected Goals format, frontend loading state-ovi.

### 2.5 Implementacija (2026-09-28)

| RC    | Status   | Promene (suština)                                                                                                                                                                                                |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RC-5  | Kod      | [`status-map.ts`](lib/ai/status-map.ts) cron → `backfill`; [`warm-ai-prematch.ts`](lib/ingestion/warm-ai-prematch.ts) scope `backfill`; GHA [`pick-ingestion-gha-jobs.mjs`](scripts/pick-ingestion-gha-jobs.mjs) |
| RC-6  | Kod + UI | [`aiService.ts`](lib/services/aiService.ts) stale fallback + `contextStale`; [`AIInsightProvider`](components/ai/AIInsightProvider.tsx), [`AIHeroCard`](components/ai/AIHeroCard.tsx)                            |
| RC-7  | Kod + UI | [`readHistoricalPrematchInsight`](lib/services/aiService.ts) `OK` + `prediction: null`; [`AIHeroCard`](components/ai/AIHeroCard.tsx) / [`AIHeroDetailedPanel`](components/ai/AIHeroDetailedPanel.tsx)            |
| RC-8  | Kod      | [`aiContextService.ts`](lib/services/aiContextService.ts), [`types/ai.ts`](types/ai.ts), [`prompts.ts`](lib/ai/prompts.ts), default prompt `1.3.0` ([`env.ts`](lib/env.ts))                                      |
| RC-11 | Kod      | [`AIInsightProvider.tsx`](components/ai/AIInsightProvider.tsx) reset `ensureAttemptedRef` on eligibility flip                                                                                                    |

**Testovi:** `lib/services/aiService.test.ts` (RC-6/RC-7), ažurirani `status-map`, `warm-ai-prematch`, `aiContextService` — vitest **690/690** (2026-09-28).

**Smoke (dev DB):** fixture `provider_id` **1611380** (`d41b4c5a-…`) ima **4** distinct PREMATCH `context_hash` — RC-6 stale fallback ciljano pokriva ovaj obrazac posle deploy-a.

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
