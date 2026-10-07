# Scorence football pipeline — architecture map

**Audit date:** 2026-10-07  
**Scope:** Read-only trace of production data flow from code + Supabase (`zovobemlpqoclyjhvkpw`). No application code changed.

**Prior audit material:** `docs/audit/` had no files before this report. Related operational RCA lives under `docs/rca/` (e.g. `AI-INGESTION-RCA.md`, `PHASE-3-IMPLEMENTATION.md`).

**Stack (from repo):** Next.js 16 App Router (Vercel `fra1`), Supabase Postgres + Auth + Realtime, Upstash Redis (cache, locks, quota, live presence), API-Football (`v3.football.api-sports.io`), OpenAI, PostHog, Sentry, Vitest/Playwright/ESLint/tsc.

---

## 1. API-Football clients and wrappers

### Core HTTP layer

| File                            | Role                                                                                                                      | Called by                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `lib/api-football/client.ts`    | `apiFootballFetchResponse`, `apiFootballFetchAllPagesResponse` — auth header, retries (`p-retry`), quota, in-flight dedup | Endpoints, ingestion sync modules, `ingest-live-center-tick`               |
| `lib/api-football/config.ts`    | Base URL, retry/dedup/quota constants                                                                                     | `client.ts`, `quota.ts`, `dedup.ts`, internal metrics page                 |
| `lib/api-football/quota.ts`     | Day/minute budget tracking (memory + Redis)                                                                               | `client.ts`, ingestion schedule, live poller, diagnostics                  |
| `lib/api-football/dedup.ts`     | In-flight request coalescing                                                                                              | `client.ts`                                                                |
| `lib/api-football/errors.ts`    | `ApiFootballError`, quota/config errors                                                                                   | Client, cron-run, cache, Sentry filters                                    |
| `lib/api-football/safe-call.ts` | `safeOptionalProviderFetch`, `optionalProviderFetch`, failure formatting                                                  | `footballService`, live ingest, internal poll routes, ensure-fixture paths |
| `lib/api-football/types.ts`     | Raw provider envelope/types                                                                                               | Adapters, ingestion                                                        |
| `lib/api-football/to-db.ts`     | Row shapes for Postgres upsert                                                                                            | `upsert.ts`, `match-details-upsert.ts`, tests                              |

### Endpoint wrappers (all use `client.ts`)

| File                                     | Endpoints / functions                                              | Primary callers                                                                                                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/api-football/endpoints/fixtures.ts` | Fixtures by date/league/team/live, events, stats, lineups, players | `footballService`, `ingest-match-details`, `ingest-lineups`, `ensure-match-overview`, `ensure-fixture-persisted`, `sync-*`, `live/*`, `playerProfileService`, `fixture-provider-fill`, `probe-capabilities` |
| `lib/api-football/endpoints/leagues.ts`  | Leagues, seasons, standings, tops                                  | `bootstrap-static-data`, `sync-standings`, `sync-league-season-fixtures`, `backfill-historical-fixtures`, `footballService`, `competitions/probe-capabilities`                                              |
| `lib/api-football/endpoints/teams.ts`    | Team search, profile, season stats                                 | `footballService`                                                                                                                                                                                           |
| `lib/api-football/endpoints/players.ts`  | Player search, profile, squad, career                              | `footballService`, `playerProfileService`                                                                                                                                                                   |
| `lib/api-football/endpoints/injuries.ts` | Fixture injuries/sidelined                                         | `ingest-sidelined`, `footballService`                                                                                                                                                                       |
| `lib/api-football/endpoints/index.ts`    | Re-exports                                                         | `diagnostics`, `api-football-smoke` script                                                                                                                                                                  |

### Adapters (provider JSON → domain / DB)

| Path                                                                                                  | Callers                                       |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `lib/api-football/adapter/*` (`fixture`, `match-details`, `entities`, `league`, `sidelined`, `utils`) | Endpoints, `upsert.ts`, tests, live reconcile |

### Application read path (provider vs Postgres)

| File                                        | Behavior                                                                                                                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/services/footballService.ts`           | Main UI/server read facade: when `API_FOOTBALL_INGEST_ONLY` (default **true** in development), reads Postgres via `lib/ingestion/db-read`; optional provider fill via `fixture-provider-fill` / `ensure-fixture-persisted`. Live list can force provider when `LIVE_POLLING_ENABLED`. |
| `lib/services/fixture-provider-fill.ts`     | Date-range provider fill → upsert                                                                                                                                                                                                                                                     |
| `lib/ingestion/ensure-fixture-persisted.ts` | On-demand single fixture from provider                                                                                                                                                                                                                                                |
| `lib/services/playerProfileService.ts`      | Player pages; provider with safe optional fetch                                                                                                                                                                                                                                       |
| `lib/competitions/probe-capabilities.ts`    | Registry capability probing                                                                                                                                                                                                                                                           |

### Scripts / smoke

`scripts/api-football-smoke.ts`, `scripts/quota-smoke.ts`, `scripts/cache-smoke.ts`, `tests/helpers/load-api-football-fixture.ts`.

---

## 2. Ingestion paths

**Auth pattern:** Cron routes use `lib/ingestion/cron-auth.ts` (`Authorization: Bearer CRON_SECRET`). Production expects `CRON_SECRET`; missing → 401. Jobs use Redis lock `lock:cron:{jobName}` via `lib/ingestion/cron-run.ts` (skipped HTTP 200 if lock held).

**Observability:** Structured JSON logs via `lib/ingestion/ingestion-observability.ts` (stdout; not a Postgres table).

### Vercel Cron (`vercel.json` → `app/api/cron/*/route.ts`)

| Route                                | Schedule (UTC) | Implementation                                            | Data ingested                                                                                    | Authority                                                            |
| ------------------------------------ | -------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `/api/cron/sync-fixtures`            | `0 4 * * *`    | `lib/ingestion/sync-fixtures.ts`                          | Allowlisted leagues, date window; may inline match-details for today/tomorrow FT-capable leagues | **Authoritative** scheduled fixture upsert (daily)                   |
| `/api/cron/sync-standings`           | `30 4 * * *`   | `lib/ingestion/sync-standings.ts`                         | Standings per scheduled leagues                                                                  | **Authoritative** daily; also triggered on 6h GHA                    |
| `/api/cron/sync-match-details`       | `0 5 * * *`    | `lib/ingestion/sync-match-details.ts`                     | FT fixtures (~48h window): events, stats, lineups, performances                                  | **Authoritative** batch backfill                                     |
| `/api/cron/refresh-analytics`        | `0 3 * * *`    | `lib/ingestion/refresh-analytics.ts` → `analyticsService` | Form + H2H snapshots in Postgres (no provider)                                                   | **Authoritative** derived analytics refresh                          |
| `/api/cron/warm-ai-prematch`         | `15 5 * * *`   | `lib/ingestion/warm-ai-prematch.ts`                       | OpenAI prematch insights for NS/TBD window                                                       | **Authoritative** shared cache warm (default scope from route query) |
| `/api/cron/reap-stale-locks`         | `45 5 * * *`   | `lib/live/reap-stale-locks.ts`                            | Live poll lock cleanup                                                                           | Live-only; **skipped** if `!LIVE_POLLING_ENABLED`                    |
| `/api/cron/cleanup-ai-usage`         | `0 2 * * *`    | Route handler (usage cleanup)                             | `ai_usage` hygiene                                                                               | Authoritative                                                        |
| `/api/cron/send-trial-ending-emails` | `0 6 * * *`    | Email cron                                                | Billing/notifications                                                                            | Non-football                                                         |
| `/api/cron/sync-player-bios`         | `0 7 * * 0`    | Wikipedia bio sync                                        | Player bios                                                                                      | Adjacent                                                             |

**Not in `vercel.json` (production relies on GitHub Actions to hit same route handlers):**

| Route                                       | GHA schedule                   | Implementation                          | Data                                        | Authority vs duplicate                                                            |
| ------------------------------------------- | ------------------------------ | --------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| `/api/cron/sync-lineups`                    | `*/15 * * * *`                 | `lib/ingestion/sync-lineups.ts`         | NS/TBD lineups (~90 min window)             | **Authoritative** for lineups; duplicate trigger vs manual `npm run sync:lineups` |
| `/api/cron/sync-live-center`                | `*/15 * * * *`                 | `lib/live/ingest-live-center-tick.ts`   | Live fixtures bulk ingest + stale reconcile | **Authoritative** when polling enabled; else no-op `skipped`                      |
| `/api/cron/sync-fixtures-today`             | `*/15 * * * *`                 | `lib/ingestion/sync-fixtures-today.ts`  | Today’s fixtures + prematch readiness       | **Authoritative** intraday fixture refresh                                        |
| `/api/cron/sync-fixtures-future`            | `0 3 * * *`                    | `lib/ingestion/sync-fixtures-future.ts` | Future fixture horizon / league-season      | **Authoritative**; same clock as `refresh-analytics` (different paths)            |
| `/api/cron/reconcile-ai-usage`              | `*/5 * * * *`                  | Route → entitlement reconciliation      | `ai_usage`                                  | Billing adjacency                                                                 |
| `/api/cron/reap-stale-locks`                | `*/5 * * * *` (GHA)            | same as Vercel                          | locks                                       | **Duplicate trigger** (5 min GHA + daily Vercel)                                  |
| `/api/cron/warm-ai-prematch?scope=imminent` | `*/15 * * * *` (warm workflow) | `warm-ai-prematch.ts`                   | Imminent kickoffs                           | **Duplicate trigger** vs daily Vercel warm                                        |
| `/api/cron/warm-ai-prematch?scope=daily`    | `0 */6 * * *`                  | same                                    | 36h window                                  | **Duplicate trigger** vs Vercel 05:15 job                                         |
| `/api/cron/sync-standings`                  | `0 */6 * * *`                  | `sync-standings.ts`                     | Standings                                   | **Duplicate trigger** vs Vercel 04:30                                             |

GHA picker: `scripts/pick-ingestion-gha-jobs.mjs` + workflows `ingestion-schedule-{5min,15min,6h,daily}.yml`, `ingestion-ai-warm-{15min,6h}.yml`, `ingestion-cadence-watchdog.yml` (recovery at `:02/:17/:32/:47`), manual `ingestion-schedule.yml` (`workflow_dispatch`). Triggers: `scripts/trigger-production-cron.mjs` / `trigger-fifteen-minute-cron-batch.mjs`.

### Internal live (not Vercel cron)

| Route                                                   | Trigger                                                | Role                                                       |
| ------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| `POST /api/internal/live/poll-tick?fixtureProviderId=`  | Chained from `lib/live/poller.ts` when viewers present | Per-fixture provider tick → `fixture-live-ingest-pipeline` |
| `POST /api/internal/live/poll-center-tick`              | Poller / watch session                                 | Live center cadence                                        |
| `POST /api/internal/live/follow-notification-poll-tick` | Follow poller                                          | Notifications                                              |

### Manual npm scripts (`scripts/run-*.ts` → `lib/ingestion/*`)

Same core functions as crons: `sync:fixtures`, `sync:fixtures-today`, `sync:standings`, `sync:match-details`, `sync:lineups`, `sync:warm-ai-prematch`, `bootstrap:static-data`, `bootstrap:match-details`, `backfill:historical-fixtures`, `ingest:dev-qa`, `diagnose:ingestion`, `verify:ingestion`.

### On-demand / recovery

| Mechanism                         | File                                                                         | Notes                                                       |
| --------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Provider fill for missing DB rows | `ensure-fixture-persisted`, `fixture-provider-fill`, `ensure-match-overview` | Used from `footballService` when not ingest-only or gaps    |
| Historical backfill               | `lib/ingestion/backfill-historical-fixtures.ts`, tiers                       | Uses `ingestion_sync_runs`, `ingestion_league_season_state` |
| League-season sync                | `sync-league-season-fixtures.ts`                                             | Checkpoints in `ingestion_league_season_state`              |
| Stale live reconcile              | `lib/live/reconcile-stale-live.ts`                                           | From live-center cron when polling on                       |
| Repair scripts                    | `repair-missing-lineups`, `repair-fixture-event-players`                     | Manual ops                                                  |

### UI/API ingestion triggers

- `GET/POST /api/ai/prematch/[fixtureId]` — may compute prediction + generate insight on POST.
- `GET /api/ai/live/[fixtureId]` — live insight read/generation path via `aiService`.
- `GET /api/predictions` — prediction API surface.
- `GET /api/fixtures`, `/api/dashboard/live`, `/api/matches/[fixtureId]/snapshot` — read mostly Postgres (`footballService` / live fetch).

**Duplicate summary:** Fixture upsert has **daily Vercel** + **15m today sync** + manual scripts. Standings/warm/reap have **Vercel + GHA** overlap by design (GHA compensates Hobby cron limits and GitHub schedule drift).

---

## 3. Database (football domain)

**Source:** `supabase/migrations/*`, `types/supabase.ts`, `docs/DB.md`. Timestamps: `timestamptz` (UTC storage). Display/grouping uses viewer timezone (often `Europe/Belgrade` in tests/fixtures UI — `lib/datetime/*`, `lib/fixtures/display.ts`).

### Core entities

| Table       | Keys / uniqueness                   | Notable indexes                |
| ----------- | ----------------------------------- | ------------------------------ |
| `countries` | `provider_id` unique, `code` unique | —                              |
| `leagues`   | `provider_id` integer **unique**    | `country_id`, `prestige_score` |
| `seasons`   | **unique (`league_id`, `year`)**    | `is_current` partial           |
| `venues`    | `provider_id` unique                | `country_id`                   |
| `teams`     | `provider_id` integer **unique**    | —                              |
| `players`   | `provider_id` integer **unique**    | —                              |

### Fixtures and match state

| Table                       | Keys / uniqueness                                    | Indexes                                                                                                                                                                      |
| --------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fixtures`                  | `provider_id` bigint **unique**                      | `league_id`, `season_id`, `kickoff_at`, `status`, partial `is_live`, team FKs, `date_kickoff`, team+kickoff desc (migration 0034), `prematch_readiness` GIN expression index |
| `fixture_events`            | **unique (`fixture_id`, `provider_event_id`)**       | fixture+minute, team, player, type                                                                                                                                           |
| `fixture_statistics`        | **unique (`fixture_id`, `team_id`)**                 | fixture_id, team_id                                                                                                                                                          |
| `lineups`                   | **unique (`fixture_id`, `team_id`)**                 | fixture_id, team_id                                                                                                                                                          |
| `lineup_players`            | (see migrations 0004+)                               | lineup FK indexes                                                                                                                                                            |
| `fixture_sidelined_players` | **unique (fixture, team, player_provider_id, kind)** | fixture, team                                                                                                                                                                |
| `player_match_performances` | **unique (`fixture_id`, `player_id`)**               | fixture, player, team                                                                                                                                                        |

### Analytics

| Table            | Keys / uniqueness                                         | Indexes                                         |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------- |
| `form_snapshots` | **unique (`team_id`, `scope`, `matches`, `captured_at`)** | team+scope+matches+time                         |
| `h2h_summaries`  | pair ordering check `team_a_id < team_b_id`               | `(team_a_id, team_b_id, scope)`, league, team_b |
| `standings`      | (row per team/season/league — see 0004)                   | `(league_id, season_id, rank)`, team, season    |

### Predictions and AI

| Table            | Keys / uniqueness                                                           | Indexes                                                               |
| ---------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `model_versions` | `version` **unique**                                                        | partial active                                                        |
| `predictions`    | PK uuid; no unique on (fixture, type) — latest/official by query            | `(fixture_id, created_at desc)`, type, model, partial prematch latest |
| `ai_insights`    | **unique (`fixture_id`, `type`, `context_hash`)** where fixture_id not null | fixture+time, type, context_hash, FK indexes                          |
| `ai_usage`       | **unique (`user_id`, `usage_day`)**                                         | user+day                                                              |

**Official prematch prediction (application logic, not DB constraint):** last `PREMATCH` row with `created_at < kickoff_at` (`lib/predictions/db.ts` → `readOfficialPrematchPrediction`).

### Ingestion status

| Table                           | Purpose                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `ingestion_sync_runs`           | Job run log (`job_name`, `status`, `stats`, `started_at` / `finished_at`)     |
| `ingestion_league_season_state` | PK (`league_provider_id`, `season_year`) — fixture sync checkpoints           |
| `ingestion_team_sync_state`     | PK `team_provider_id` — gap-fill state                                        |
| `fixtures.prematch_readiness`   | JSON snapshot (`aiEligible`, reasons, etc.) + `prematch_readiness_updated_at` |

### Not stored in Postgres (as of migrations)

- **Betting odds** — mentioned in PRD/marketing only; no `odds` table in migrations.
- **Provider predictions** — Scorence computes in-house (`predictions` table).

---

## 4. Prediction pipeline

| Stage         | Location                                                                                          | Inputs                                                                  | Outputs / storage                                                             |
| ------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Feature build | `lib/models/features.ts` (`buildPrematchFeatures`), `lib/models/live-features.ts`                 | Postgres: form, H2H, standings, lineups, Elo, injuries, team aggregates | Feature vectors                                                               |
| Scoring       | `lib/models/logistic.ts`, `poisson.ts`, `liveProbability.ts`, `coefficients.ts`, `calibration.ts` | Features + active `model_versions.coefficients`                         | Probabilities, xG bands, confidence                                           |
| Orchestration | `lib/services/predictionService.ts`                                                               | Fixture external id, locks (`lib/redis/keys`)                           | `getOrComputePrematch`, `updateLiveProbability`, freshness/fingerprint checks |
| Persistence   | `lib/predictions/db.ts`                                                                           | Model version id                                                        | `predictions` rows (`type` PREMATCH \| LIVE, `input_snapshot` jsonb)          |
| API           | `app/api/predictions/route.ts`, match live delta route                                            | Auth/entitlements                                                       | JSON to client                                                                |
| Live updates  | `lib/live/meaningful-event-pipeline.ts`                                                           | Detector snapshot, events                                               | New LIVE rows when shift meaningful (`lib/live/probability-shift.ts`)         |

**Read paths:** `readLatestPrematchPrediction`, `readOfficialPrematchPrediction`, `readLatestLivePrediction` → mapped in `predictionService` / UI delta (`app/api/matches/[fixtureId]/live-probability-delta/route.ts`).

---

## 5. AI pipeline

| Concern                    | Location                                                                                                 | Notes                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Context builder (prematch) | `lib/services/aiContextService.ts` (`buildPrematchContext`)                                              | DB reads: fixture, form, H2H, lineups, sidelined, standings, team aggregates; merges prediction |
| Context builder (live)     | `aiContextService` (`buildLiveContext`, prompts)                                                         | Live snapshot, prematch reference, events                                                       |
| `context_hash`             | `lib/ai/hash.ts` (`computeContextHash` — SHA-256 of stable JSON)                                         | Stored on `ai_insights.context_hash`; dedup via unique index                                    |
| Eligibility                | `lib/ai/prematch-availability.ts`, `lib/ai/status-map.ts`, `lib/ingestion/fixture-prematch-readiness.ts` | Model signal vs generic baseline; fixture phase; analyzable statuses                            |
| Generation                 | `lib/services/aiService.ts`                                                                              | OpenAI via `lib/ai/openai.ts`, prompts `lib/ai/prompts.ts`, validate `lib/ai/schemas.ts`        |
| Storage                    | `lib/ai/db.ts` (`insertAiInsight`), `lib/ai/cache.ts` (Redis prematch/live cache)                        | Postgres `ai_insights`; LIVE append-only per hash                                               |
| Daily limits               | `lib/ai/usage-gate.ts` → `lib/entitlements/entitlementService.ts`                                        | Free caps from env (`FREE_TIER_*`); Postgres `ai_usage` + Redis mirror                          |
| Cron warm                  | `lib/ingestion/warm-ai-prematch.ts`                                                                      | `generatePrematchInsight(..., { trigger: "cron" })` without user id                             |
| User trigger               | `POST /api/ai/prematch/[fixtureId]`                                                                      | Records usage, PostHog                                                                          |

**Prematch insight sharing:** One row per `(fixture_id, PREMATCH, context_hash)` — shared across users.

---

## 6. Live pipeline

```
Viewer opens match → POST /api/live/watch (requires LIVE_POLLING_ENABLED)
  → Redis presence + lib/live/viewers.ts
  → lib/live/poller.ts chains POST /api/internal/live/poll-tick
      → lib/live/ingest-live-tick.ts (API-Football fixture fetch if enabled)
      → lib/live/fixture-live-ingest-pipeline.ts
          → meaningful-event-pipeline (detect → live prediction → live AI)
          → Supabase Realtime broadcast (lib/live/broadcaster.ts)
Client: useLiveMatch → React Query snapshot + broadcast subscription
Parallel cron: sync-live-center (bulk live ingest + reconcile-stale-live)
```

| Component               | File                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Polling cadence / locks | `lib/live/poller.ts`, `lib/live/coordinator.ts`, `lib/live/constants.ts`                                |
| Live state in DB        | Upserts via ingest ticks (`ingest-live-tick`, `ingest-live-center-tick`) through ingestion upsert paths |
| Live prediction         | `meaningful-event-pipeline.ts` → `predictionService.updateLiveProbability`                              |
| Live AI                 | `generateLiveInsight` in `aiService.ts`, schedule/backoff `lib/live/live-insight-schedule.ts`           |
| Client fetch            | `lib/live/live-fetch.ts`, `app/api/matches/[fixtureId]/snapshot/route.ts`, `app/api/live/route.ts`      |

When `LIVE_POLLING_ENABLED` is false (default): watch route fails closed, ingest ticks skip, crons return `skipped: true` (HTTP 200).

---

## 7. Frontend (match experience)

| Piece                | Path                                      | Role                                                                                                                            |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Match page (RSC)     | `app/(app)/matches/[fixtureId]/page.tsx`  | Loads fixture via `footballService`; wraps `MatchLiveSession` → `AIInsightProvider` → lazy `MatchAIHeroSection`                 |
| `MatchLiveSession`   | `components/match/MatchLiveSession.tsx`   | Context: `useLiveMatch`, local clock, sound, watch limits                                                                       |
| `AIInsightProvider`  | `components/ai/AIInsightProvider.tsx`     | React Query: prematch GET, live insight, historical prematch, probability delta; **`liveViewModel`** vs **`prematchViewModel`** |
| `MatchAIHeroSection` | `components/match/MatchAIHeroSection.tsx` | Dynamic import of `AIHeroSection`                                                                                               |
| React Query root     | `components/providers/QueryProvider.tsx`  | Default `staleTime: 15s`, retry 1                                                                                               |
| Live query keys      | `lib/live/query-keys.ts`                  | Used by provider + `useLiveMatch`                                                                                               |
| `useLiveMatch`       | `hooks/useLiveMatch.ts`                   | Snapshot query, Realtime subscribe, watch session                                                                               |

---

## 8. Environment flags and config

| Name                                      | Read in                         | Default if unset                                                       | Effect                                                  |
| ----------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| `API_FOOTBALL_KEY`                        | `lib/env.ts`, client            | none                                                                   | No provider calls                                       |
| `API_FOOTBALL_BASE_URL`                   | `lib/env.ts`                    | `https://v3.football.api-sports.io`                                    | Provider host                                           |
| `API_FOOTBALL_DAILY_LIMIT`                | `getApiFootballDailyLimit`      | **100**                                                                | Quota ceiling                                           |
| (derived) minute limit                    | `getApiFootballMinuteLimit`     | **10** dev / **300** prod                                              | From `NEXT_PUBLIC_APP_ENV`                              |
| `API_FOOTBALL_INGEST_ONLY`                | `isApiFootballIngestOnly`       | **true in development**, false if explicit `false` in prod             | UI/services read Postgres; limits live provider reads   |
| `LIVE_POLLING_ENABLED`                    | `isLivePollingEnabled`          | **false**                                                              | Gates live ingest, watch, reap-stale-locks, coordinator |
| `API_FOOTBALL_LINEUPS_SYNC_ENABLED`       | `lib/ingestion/config.ts`       | prod **on**, dev **off** unless `true`                                 | Lineups cron body                                       |
| `LINEUPS_SYNC_BATCH`                      | `config.ts`                     | 30                                                                     | Batch size                                              |
| `INGESTION_LEAGUE_PROVIDER_IDS`           | `config.ts`                     | legacy 11 leagues in dev                                               | Allowlist override                                      |
| `INGESTION_USE_FULL_REGISTRY`             | `config.ts`                     | prod uses full registry                                                | Competition set                                         |
| `MATCH_DETAILS_SYNC_BATCH`                | `sync-match-details.ts`         | 10                                                                     | FT detail batch                                         |
| `CRON_SECRET`                             | `cron-auth`, live internal auth | none                                                                   | Cron/internal auth                                      |
| `OPENAI_API_KEY` / `OPENAI_MODEL_DEFAULT` | `lib/ai/openai.ts`              | model **gpt-4o-mini**                                                  | AI generation                                           |
| `AI_PROMPT_VERSION`                       | `getAiPromptVersion`            | **1.2.0**                                                              | Context cache keys + insight rows                       |
| `AI_PREMATCH_CACHE_TTL_SEC`               | `getAiPrematchCacheTtlSec`      | 86400                                                                  | Redis TTL                                               |
| `FREE_TIER_AI_*` / `PREMIUM_AI_*`         | `lib/env.ts`, entitlements      | predictions/day **5**, generations **10**, live AI matches **3**, etc. | Usage gates                                             |
| Upstash vars                              | `hasRedisConfig`                | optional locally                                                       | Cache, locks, quota persistence, live presence          |

**Doc drift:** `.env.example` suggests `LIVE_POLLING_ENABLED=true`; runtime default remains **false** unless set.

---

## 9. Tests, typecheck, lint (baseline this audit)

| Command                 | How                    | Result (2026-10-07, local)                                                                                                                              |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run test:ci`   | Vitest                 | **691 passed**, 167 files                                                                                                                               |
| `npm.cmd run lint`      | ESLint                 | **0 errors**, 13 warnings                                                                                                                               |
| `npm.cmd run typecheck` | `tsc --noEmit`         | **Failed** — parse errors in `.next/dev/types/routes.d.ts` (generated Next dev types; included via `tsconfig.json`). Not re-run after cleaning `.next`. |
| CI composite            | `npm.cmd run check:ci` | Not run as single command (typecheck blocked locally)                                                                                                   |

---

## 10. Code hygiene counts (locations only)

| Pattern                                         | Count                    | Locations                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TODO`                                          | **3**                    | `lib/emails/templates/WaitlistConfirmationEmail.tsx`, `lib/dashboard/importance-score.ts`, `lib/legal/privacy-content.tsx`                                                                                                                                               |
| `FIXME`                                         | **0**                    | —                                                                                                                                                                                                                                                                        |
| `skipped: true` (TS/TSX, excl. docs)            | **~44 lines / 18 files** | Heavy in `lib/live/poller.ts`, `lib/live/follow-notification-poller.ts`; also `cron-run`, `sync-lineups`, `sync-match-details`, live ingest, `push/send.ts`, tests                                                                                                       |
| Empty / swallow `catch {`                       | **27 files**             | e.g. `lib/live/coordinator.ts`, `lib/live/watch-client.ts`, `app/api/live/watch/route.ts`, `lib/redis/client.ts`, UI toggles — review individually for intentional vs silent                                                                                             |
| Hardcoded win probabilities (football outcomes) | **1 canonical constant** | `lib/models/prematch-model-signal.ts` (`GENERIC_BASELINE_WIN_PROBABILITIES` — logistic intercept baseline; used for **signal detection**, not silent UI defaults)                                                                                                        |
| Generic / FALLBACK presentation paths           | **Multiple**             | `lib/services/aiService.ts` (`buildFallbackResponse`, status `FALLBACK`), `lib/ai/schemas.ts`, `lib/dashboard/importance-score.ts` (`PRESTIGE_FALLBACK = 0.3`), `hooks/useLiveFeed.ts` / `useFixturesQuery.ts` (`LIVE_FALLBACK_REFETCH_MS` — polling interval, not data) |

---

## 11. Verification fixtures (Supabase prod dev project)

Recorded at audit time from live DB:

| Role     | Fixture ID  | Teams                                   | League         | Season | Kickoff (UTC)                                 |
| -------- | ----------- | --------------------------------------- | -------------- | ------ | --------------------------------------------- |
| Upcoming | **1640694** | Yeşilyurt Belediyespor vs Gelecek Siirt | Türkiye Kupası | 2026   | 2026-10-07 14:00:00+00                        |
| Live     | **1635578** | Avispa Fukuoka vs Yokohama FC           | Emperor Cup    | 2026   | 2026-10-07 09:30:00+00 (`1H`, `is_live=true`) |
| Finished | **1629006** | Mexico vs Chile                         | Friendlies     | 2026   | 2026-10-07 02:30:00+00 (`FT`)                 |

Alternates if needed: upcoming `1517361` (CPL), live `1635579`, finished any recent `FT` by `kickoff_at desc`.

---

## Open questions / could not determine from repo alone

1. **Production Vercel env** — Actual values for `LIVE_POLLING_ENABLED`, `API_FOOTBALL_INGEST_ONLY`, lineups kill-switch, and Pro daily limit (requires Vercel dashboard; RCA notes same gap).
2. **Typecheck in CI** — Whether CI excludes `.next/dev/types` or always runs clean `next build` first (`/.github/workflows/ci.yml` not fully re-run here).
3. **Odds pipeline** — Product mentions odds; no ingestion table or API-Football odds endpoint in codebase.
4. **Stuck `ingestion_sync_runs`** — Historical RCA flagged a long-running row; current DB state not re-queried in this audit.
5. **Authoritative cron in hybrid deploys** — If Vercel Hobby cron and GHA both fire, lock skips duplicate runs — confirm operational SLOs use logs/metrics, not single scheduler.
6. **Europe/Belgrade for “imminent” warm window** — `warm-ai-prematch` uses UTC ISO bounds; UI “today/imminent” may use viewer TZ — confirm product intent for warm scope vs display.

---

## Assumptions

1. Supabase project `zovobemlpqoclyjhvkpw` (`user-supabasei`) is the Scorence dev/prod-equivalent DB used for verification fixtures.
2. Production traffic follows documented GHA → Production URL cron triggers when Vercel cron entries are insufficient.
3. “Architecture map” includes adjacent billing/email crons only where they touch ingestion locks or usage reconciliation.
4. Empty `catch` blocks listed by pattern search may contain comments or rethrow in branches not matched by the regex; counts are indicative.
