# Competition expansion — Phase I QA matrix

Smoke checklist for **legacy 11** leagues (unchanged behavior) plus **expansion spotlights**: Brazil, Argentina, MLS, and national-team (`NT`) competitions. Registry IDs come only from `npm.cmd run build:competition-registry` and `lib/competitions/registry.seed.ts` — do not hand-edit `registry.generated.json` or add ad-hoc provider IDs in app code.

**Windows:** use `npm.cmd` (see root `AGENTS.md`).

---

## Environment flags (ingestion scope)

Resolved in `lib/ingestion/config.ts` → `resolveIngestionLeagueProviderIds()`.

| Variable                                      | Effect                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| _(default)_ `NEXT_PUBLIC_APP_ENV=development` | Ingestion allowlist = **legacy 11** only (`LEGACY_CORE_PROVIDER_IDS`).                                                                           |
| `INGESTION_USE_FULL_REGISTRY=true`            | Ingestion uses **all enabled** registry competitions (`getEnabledProviderIds()`). Use locally to QA BR/AR/MLS/NT sync without switching app env. |
| `NEXT_PUBLIC_APP_ENV=production`              | Same as full registry — **auto-full**; explicit list not required on Vercel.                                                                     |
| `INGESTION_LEAGUE_PROVIDER_IDS=39,71,…`       | Comma-separated override; wins over full-registry flags.                                                                                         |
| `API_FOOTBALL_INGEST_ONLY=true`               | UI reads Postgres only (recommended for expansion QA).                                                                                           |

**Dev expansion ingest (example):**

```bash
set INGESTION_USE_FULL_REGISTRY=true
npm.cmd run bootstrap:static-data
npm.cmd run sync:fixtures
npm.cmd run sync:standings
```

Revert the env var (or unset it) to stay on the legacy 11 default for day-to-day dev.

---

## Registry maintenance (new IDs only here)

| Command                                      | Purpose                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm.cmd run build:competition-registry`     | Rebuild `lib/competitions/registry.generated.json` from API-Football + seed matcher. |
| `npm.cmd run probe:competition-capabilities` | Optional capability sidecar merge (see script output).                               |
| `npm.cmd run sync:league-prestige`           | Push prestige from registry into DB after registry changes.                          |

Automated guard: `vitest run lib/competitions/compatibility.test.ts` (legacy IDs stay enabled; primary tab order preserved).

---

## Ingestion commands (shared)

Full ops detail: [scripts/INGESTION.md](./scripts/INGESTION.md) and [MATCH-DATA-OPS.md](./MATCH-DATA-OPS.md).

| Command                              | When to use                                                         |
| ------------------------------------ | ------------------------------------------------------------------- |
| `npm.cmd run match:qa-sync`          | Golden path — missing bootstrap/sync steps only.                    |
| `npm.cmd run match:verify`           | Strict DB + pinned fixture report.                                  |
| `npm.cmd run diagnose:ingestion`     | Human-readable status; `--fixture-id=`, `--strict`.                 |
| `npm.cmd run verify:ingestion`       | Phase 1 gate — fixtures UTC today non-empty.                        |
| `npm.cmd run bootstrap:static-data`  | Leagues + seasons (required before expansion leagues appear in DB). |
| `npm.cmd run sync:fixtures`          | Fixtures for current ingestion allowlist / window.                  |
| `npm.cmd run sync:standings`         | Standings for allowlist (Free tier may block some seasons).         |
| `npm.cmd run sync:match-details`     | FT fixtures in cron window.                                         |
| `npm.cmd run sync:lineups`           | Upcoming NS/TBD within lineup window.                               |
| `npm.cmd run phase-g:national-smoke` | DB smoke for NT sample leagues (see NT table).                      |
| `npm.cmd run phase2:fixtures-smoke`  | Service-level fixtures page data non-empty.                         |
| `npm.cmd run api-football:smoke`     | Provider auth + quota probe.                                        |

---

## Smoke matrix — legacy 11 (must not regress)

Source of truth: `lib/competitions/legacy.ts` (`LEGACY_CORE_PROVIDER_IDS`). UX tabs: 8 primary + 3 in “More”.

| ID  | Competition            | Tab UX        | Quick smoke                                                                      |
| --- | ---------------------- | ------------- | -------------------------------------------------------------------------------- |
| 39  | Premier League         | Primary       | `/fixtures?league=39` · league page `/leagues/39` · one `/matches/<id>` FT or NS |
| 140 | La Liga                | Primary       | `/fixtures?league=140`                                                           |
| 135 | Serie A (Italy)        | Primary       | `/fixtures?league=135`                                                           |
| 78  | Bundesliga             | Primary       | `/fixtures?league=78`                                                            |
| 61  | Ligue 1                | Primary       | `/fixtures?league=61`                                                            |
| 2   | UEFA Champions League  | Primary       | `/fixtures?league=2`                                                             |
| 3   | UEFA Europa League     | Primary       | `/fixtures?league=3`                                                             |
| 848 | UEFA Conference League | Primary       | `/fixtures?league=848`                                                           |
| 94  | Primeira Liga          | More          | `/fixtures?league=94`                                                            |
| 88  | Eredivisie             | More          | `/fixtures?league=88`                                                            |
| 286 | Super Liga (Serbia)    | More (tier 2) | `/fixtures?league=286`                                                           |

**Pinned match QA (legacy path):** see `lib/qa/pinned-fixture-ids.ts` and [INGESTION.md § Pinned QA fixtures](./scripts/INGESTION.md#pinned-qa-fixtures).

**Automated:** `npm.cmd run test:ci` includes `lib/competitions/compatibility.test.ts` and `lib/ingestion/config.test.ts`.

---

## Smoke matrix — expansion spotlights

Requires **`INGESTION_USE_FULL_REGISTRY=true`** (or production) + `bootstrap:static-data` + `sync:fixtures` at least once.

### BR / AR / MLS (tier 1 domestic)

| ID  | Competition                | Country filter | Quick smoke                                                                                             |
| --- | -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| 71  | Serie A                    | `Brazil`       | `/fixtures?country=Brazil` · `/fixtures?league=71` · match overview + standings tab if standings synced |
| 128 | Liga Profesional Argentina | `Argentina`    | `/fixtures?country=Argentina` · `/fixtures?league=128`                                                  |
| 253 | Major League Soccer        | `USA`          | `/fixtures?country=USA` · `/fixtures?league=253` · search `Major League` on `/fixtures`                 |

### NT (national team — sample set)

Aligned with `PHASE_G_SMOKE_FIXTURE_QUOTAS` in `lib/match/fixture-context.ts` and `npm.cmd run phase-g:national-smoke`.

| ID  | Competition                      | Quick smoke                                                 |
| --- | -------------------------------- | ----------------------------------------------------------- |
| 1   | World Cup                        | Registry enabled · `/fixtures?league=1` when fixtures exist |
| 5   | UEFA Nations League              | `/fixtures?league=5` · match context `national_team`        |
| 10  | Friendlies                       | `/fixtures?league=10`                                       |
| 32  | World Cup - Qualification Europe | `/fixtures?league=32`                                       |

**NT match UI:** open any synced NT fixture — overview copy uses “team” nouns; H2H label “Same competition”; standings tab only when capabilities allow (`competitionSupportsStandings`).

---

## Fixtures discovery (country + search)

Manual:

1. Open `/fixtures`.
2. Country select → e.g. **Brazil** → URL `?country=Brazil`, list scoped to Brazilian competitions in window.
3. Search box → e.g. `MLS` → Enter → URL `?q=MLS` (league tab cleared when country changes from “All countries”).

Automated (optional, guest):

```bash
npm.cmd run e2e -- e2e/fixtures-discovery.spec.ts
```

Requires dev server or `PLAYWRIGHT_BASE_URL` pointing at an environment with the fixtures page reachable.

---

## Phase I exit checklist

- [ ] `npm.cmd run test:ci` green.
- [ ] `npm.cmd run typecheck` green.
- [ ] Legacy 11: primary/More tabs unchanged; all IDs pass `compatibility.test.ts`.
- [ ] With full registry ingest: BR (71), AR (128), MLS (253) show fixtures or honest empty state (not provider errors).
- [ ] `npm.cmd run phase-g:national-smoke` passes after NT fixture sync (or documented skip if quota/API blocked).
- [ ] Optional: fixtures discovery Playwright spec passes.

---

## Related docs

- [scripts/INGESTION.md](./scripts/INGESTION.md) — cron, troubleshooting, pinned fixtures.
- [ING-3-pro-cutover.md](./ING-3-pro-cutover.md) — production API tier and crons.
- [Tech.md](./Tech.md) — architecture § ingestion / competitions.
