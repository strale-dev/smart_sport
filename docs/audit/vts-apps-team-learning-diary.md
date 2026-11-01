# Dnevnik učenja — VTŠ Apps Team (Scorence)

Jedna strana. Prvo lice. 2026-11-01.

## Kako sam učio i gde sam tražio

Nisam krenuo od praznog tutoriala nego od **postojećeg sistema**. Redosled: `docs/PRD.md`, `docs/Tech.md`, `docs/DB.md`, audit `09-1` / `09-2`, `docs/rca/AI-INGESTION-RCA.md`, pa kod (`footballService`, `cache.ts`, cron-ovi). Za šemu i žive brojke — Supabase MCP (`user-supabasei`), read-only SQL. Za pad produkcije — Vercel runtime log (`ENOTFOUND` na Upstash), ne nagađanje. API-Football ponašanje sam čitao iz našeg klijenta (`fetch-outcome`, quota/rate-limit klase) i iz njihovog envelope-a (`errors.requests` uz HTTP 200). Cursor/agent je bio brži tragac po fajlovima; izvore sam proveravao u gitu i u bazi.

## Gde sam zapao

Prvo sam mešao **Redis pad** i **API-Football pad**. Oba u logu izgledaju kao `fetch failed`. Razdvojilo ih je: `getaddrinfo ENOTFOUND …upstash.io` na `/dashboard`, plus to što `cached()` pre VTS-a nije imao try/catch. Drugo: `CacheMeta.cachedAt` **nije** poslednji sync provajdera — to je vreme upisa u keš. Zato je freshness otišao na `providerSyncedAt` (run → meč → liga → keš). Treće: master plan YAML je ostao `pending` dok je kod već bio mergovan — loš izvor istine. Rešenje: recon (`git log --grep=vts`, diff vs `origin/main`, MCP snapshot), pa tek dokumentacija.

## Šta bih sledeći put drugačije

Plan YAML ažurirati **u istom commitu** kao fazu, ne na kraju. Classifier odmah na sve job-ove koji pišu `ingestion_sync_runs`, ne samo na `sync-fixtures-today` (tabela i dalje ima samo `error_message`). Assignment granu ne mešati sa fixtures/AI Phase 2 u isti PR ako ocena traži uzak diff. Ops (Upstash, quota, D2 stale NS) odvojiti rečenicom na početku, da se „crveni cron“ ne tumači kao pad zadatka.

## Jedna odluka: zašto baš ta dva unapređenja

Izabrao sam **(1) fallback + svežina na `/fixtures`** i **(2) klasifikaciju greške + Redis fail-open**. Prvo je ono što vidi korisnik: sačuvani mečevi umesto prazne liste ili `error.tsx`, i bedž na srpskom vezan za pravi sync. Drugo je ono što vidi operater: `error_type` umesto opačne poruke, i stranica koja preživi mrtav Redis. Nisam dirao model tačnosti ni full ingest green-up — to nije bilo merljivo u assignment prozoru i troši kvotu.

## Put podatka (5–6 rečenica)

API-Football (`/fixtures`) zove naš klijent (auth, kvota, retry). Cron (`sync-fixtures-today` i ostali) mapira odgovor i upsert-uje u Postgres (`fixtures`, event/stat tabele). UI ne ide na provajdera u ingest-only režimu: `getFixturesData` → `getMatchesInRange` čita bazu (keš ako Redis radi; ako ne, fail-open pa opet baza). `/api/fixtures` i React Query šalju `FixturesData` na listu; bedž koristi `providerSyncedAt`. „AI predikcije“ nisu isti sloj: najpre in-house model (`predictionService`, 1/X/2 iz forme/H2H/rejtinga), pa readiness gate. Tek ako predikcija nije generic baseline, `aiService` šalje kompaktan kontekst u OpenAI i čuva `ai_insights` — LLM **objašnjava** brojke, ne zamenjuje sync.

## Šta sam pisao sam, a šta uz AI

Sam: izbor dva unapređenja, granica scope-a (ne merge/deploy, ne full ingest), provera da bedž nije `cachedAt`, i da unavailable ≠ empty. Uz AI (Cursor): veći deo implementacije, testova i ovih dokumenata. Pregledao sam diff i SQL; nisam pretvarao da sam svaku liniju kucao ručno. To je tačno i za ovaj dnevnik — rečenice su moje teze, tekst je sastavljen uz agenta.

## Ko plaća, koliko, i najveći rizik

Plaćao bi **navijač koji hoće analitičara pored sebe**, ne kladioničar — PRD izričito isključuje kvote. Cena u PRD: **€2.99/mesec**, 7 dana trial, kartica unapred; free tier ima dnevni AI limit. Najveći rizik rasta nije UI, nego **API-Football**: dnevni/minutni limit, uslovi (nema redistribucije kao betting feed), i to što Hobby cron + GHA 58s budget ne stignu ceo registar. Drugi usko grlo koje smo već udarili: **Upstash free quota / mrtav host** — bez fail-open-a pada ceo dashboard. Ako kvota ili ToS stisnu, proizvod ne skalira linearno sa brojem liga.
