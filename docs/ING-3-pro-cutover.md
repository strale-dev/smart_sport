# ING-3 — Vercel Production env & API-Football Pro cutover

Canonical runbook for **Vercel Production** environment variables and the **API-Football Free → Pro** cutover (cron schedule + ingestion flags). Local development stays on a Free key and `NEXT_PUBLIC_APP_ENV=development`.

**When to run:** Hard gate before [Phase 5 live engine](./ROADMAP.md#api-football-pro-key--cutover). Lineups cron route and body (**ING-1**, **ING-2**) are already in the repo; this doc covers env, schedule, and verification.

---

## Vercel environment scope

| Vercel target                   | Cron jobs                                          | Guidance                                             |
| ------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| **Production** (`scorence.app`) | Yes — schedules in [`vercel.json`](../vercel.json) | Set the full matrix below; Pro cutover applies here. |

**Vercel Hobby (current):** `vercel.json` must use **at most one run per cron job per day** or Production deploys fail at build time. Sub-daily **lineups** and **6h standings** are triggered from [`.github/workflows/ingestion-schedule.yml`](../.github/workflows/ingestion-schedule.yml). Configure **GitHub → Settings → Secrets and variables → Actions**: repository secret **`CRON_SECRET`** (must match Vercel Production `CRON_SECRET` exactly), optional repository variable **`PRODUCTION_SITE_URL`** (defaults to `https://scorence.app` if unset). After upgrading to **Vercel Pro**, move schedules to `VERCEL_CRON_PRO_TARGETS` in [`lib/ingestion/vercel-cron-contract.ts`](../lib/ingestion/vercel-cron-contract.ts) and update `vercel.json`; CI runs `npm run validate:vercel-cron` on Hobby-safe schedules until then.
| **Preview** (PR deployments) | No | Do not mirror Pro `API_FOOTBALL_KEY` or `NEXT_PUBLIC_APP_ENV=production` unless you intentionally burn quota. Prefer dev Supabase + no provider key. |
| **Local** (`.env.local`) | Manual scripts only | Free key, `API_FOOTBALL_INGEST_ONLY=true`, `NEXT_PUBLIC_APP_ENV=development`. |

Use the **Production** Supabase project (Scorence prod), not the dev project, for Production env vars.

---

## Full Production environment matrix

Set these in **Vercel → Project → Settings → Environment Variables → Production**. Values must match what [`lib/env.ts`](../lib/env.ts) validates at build/runtime (see also [`.env.example`](../.env.example)).

### Public / app

| Variable                               | Required at launch | Typical value              | Notes                                                               |
| -------------------------------------- | ------------------ | -------------------------- | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes                | `https://….supabase.co`    | Prod project URL                                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes                | `eyJ…`                     | Anon / publishable key                                              |
| `NEXT_PUBLIC_SITE_URL`                 | Yes                | `https://scorence.app`     | Canonical site URL                                                  |
| `NEXT_PUBLIC_APP_ENV`                  | Yes                | `production`               | Drives ingestion window (±7 days), lineups default-on, minute quota |
| `NEXT_PUBLIC_POSTHOG_KEY`              | Yes                | `phc_…`                    | Project API key (not personal `phx_`)                               |
| `NEXT_PUBLIC_POSTHOG_HOST`             | Yes                | `https://eu.i.posthog.com` | EU cloud                                                            |
| `NEXT_PUBLIC_SENTRY_DSN`               | Yes                | Sentry DSN URL             | Client / build Sentry                                               |

### Server core

| Variable                    | Required at launch | Typical value          | Notes                               |
| --------------------------- | ------------------ | ---------------------- | ----------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes                | `eyJ…`                 | Server-only; never expose to client |
| `UPSTASH_REDIS_REST_URL`    | Yes                | `https://….upstash.io` | Distributed cache + locks           |
| `UPSTASH_REDIS_REST_TOKEN`  | Yes                | `…`                    | Pair with URL above                 |

### Cron & API-Football ingestion

| Variable                            | Required at launch         | Typical value                       | Notes                                                                                                         |
| ----------------------------------- | -------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `CRON_SECRET`                       | Yes                        | Random string                       | Vercel sends `Authorization: Bearer …` to cron routes; missing → 401                                          |
| `API_FOOTBALL_KEY`                  | Yes (for cron/UI provider) | Pro key after cutover               | Free key OK only pre-cutover with kill-switches                                                               |
| `API_FOOTBALL_BASE_URL`             | Optional                   | `https://v3.football.api-sports.io` | Default if unset                                                                                              |
| `API_FOOTBALL_DAILY_LIMIT`          | Yes after Pro              | `7500`                              | Must match key tier ([`getApiFootballDailyLimit`](../lib/env.ts); default 100 if unset)                       |
| `API_FOOTBALL_INGEST_ONLY`          | Recommended explicit       | `false` after Pro                   | Unset + `production` → **false** (on-demand provider allowed). Pre-cutover set `true` to avoid provider reads |
| `API_FOOTBALL_LINEUPS_SYNC_ENABLED` | Pre-cutover only           | `false`                             | Kill-switch; remove or `true` after Pro                                                                       |
| `LINEUPS_SYNC_BATCH`                | Optional                   | `30`                                | Max NS/TBD fixtures per lineups run                                                                           |

Runtime behavior is defined in [`lib/ingestion/config.ts`](../lib/ingestion/config.ts) and [`lib/env.ts`](../lib/env.ts).

### AI

| Variable                           | Required at launch    | Typical value | Notes                       |
| ---------------------------------- | --------------------- | ------------- | --------------------------- |
| `OPENAI_API_KEY`                   | When AI features ship | `sk-…`        | Prematch / live generation  |
| `OPENAI_MODEL_DEFAULT`             | Optional              | `gpt-4o-mini` | Default model               |
| `FREE_TIER_AI_PREDICTIONS_PER_DAY` | Optional              | `5`           | Entitlement default         |
| `AI_PREMATCH_CACHE_TTL_SEC`        | Optional              | `86400`       | Cache TTL                   |
| `AI_PROMPT_VERSION`                | Optional              | `1.0.0`       | Bust cache on prompt change |

### Email

| Variable         | Required at launch | Typical value                   | Notes                             |
| ---------------- | ------------------ | ------------------------------- | --------------------------------- |
| `RESEND_API_KEY` | Yes                | `re_…`                          | Transactional + auth email        |
| `RESEND_FROM`    | Yes                | `Scorence <hello@scorence.app>` | Domain must be verified in Resend |

### Observability

| Variable            | Required at launch | Typical value       | Notes                                  |
| ------------------- | ------------------ | ------------------- | -------------------------------------- |
| `SENTRY_DSN`        | Yes                | Sentry DSN URL      | Server errors                          |
| `SENTRY_ORG`        | Yes                | `scorence`          | Source maps / CLI                      |
| `SENTRY_PROJECT`    | Yes                | `javascript-nextjs` | Source maps / CLI                      |
| `SENTRY_AUTH_TOKEN` | Optional           | `sntrys_…`          | Upload source maps in CI/Vercel builds |

### Live polling (Phase 5 — separate from ingestion cutover)

| Variable               | Required at launch | Typical value | Notes                                                                                                                                       |
| ---------------------- | ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `LIVE_POLLING_ENABLED` | Phase 5 only       | `true`        | **Defaults to off** if unset ([`isLivePollingEnabled`](../lib/env.ts)). Requires Pro key + Redis. See [LIVE_POLLING.md](./LIVE_POLLING.md). |

### Billing (Phase 7+)

Not in [`.env.example`](../.env.example) yet; add to Vercel when LemonSqueezy webhooks go live ([Tech.md §4.4](./Tech.md)):

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `LEMONSQUEEZY_VARIANT_ID_PREMIUM_299`

### Google OAuth

`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` are used by `npm run auth:configure-supabase` locally. Production Google sign-in is configured in **Supabase Dashboard → Authentication → Providers**; those secrets do not need to be on Vercel unless you run the configure script against prod from CI.

---

## API-Football Pro cutover — before vs after

Only ingestion-related deltas (rest of the matrix stays as above).

| Setting                             | Before Pro (safe Production)                                          | After Pro cutover                                   |
| ----------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| `API_FOOTBALL_KEY`                  | Free (or Pro not yet enabled)                                         | **Pro** subscription key                            |
| `API_FOOTBALL_DAILY_LIMIT`          | `100` (or unset → 100)                                                | **`7500`**                                          |
| `API_FOOTBALL_INGEST_ONLY`          | **`true`** recommended (Postgres-only UI, minimal on-demand)          | **`false`** (explicit)                              |
| `API_FOOTBALL_LINEUPS_SYNC_ENABLED` | **`false`** (kill-switch)                                             | unset or **`true`**                                 |
| Standings cron                      | Was daily `30 4 * * *` pre-ING-3 code                                 | **`0 */6 * * *`** (every 6h UTC) in `vercel.json`   |
| Lineups cron                        | `*/15 * * * *` (already **ING-2**); body skipped while kill-switch on | Body runs when `lineupsSyncEnabled` is true         |
| `LIVE_POLLING_ENABLED`              | unset / `false` until Phase 5                                         | **`true`** when launching live engine (Pro + Redis) |

Fixture sync window automatically becomes **today ± 7 days** when `NEXT_PUBLIC_APP_ENV=production` (vs ±1 in development).

---

## Ordered runbook

Copy into your release checklist:

- [ ] Purchase API-Football Pro; update **Vercel Production** `API_FOOTBALL_KEY` (do not commit the key).
- [ ] Set `API_FOOTBALL_DAILY_LIMIT=7500` on Production.
- [ ] Confirm Production matrix: Supabase prod, Upstash, `CRON_SECRET`, `NEXT_PUBLIC_APP_ENV=production`, Resend, Sentry, PostHog, etc.
- [ ] Deploy `main` with ING-3 `vercel.json` (`sync-standings` → `0 */6 * * *`).
- [ ] Set `API_FOOTBALL_INGEST_ONLY=false` on Production (if not already).
- [ ] Remove `API_FOOTBALL_LINEUPS_SYNC_ENABLED=false` or set it to `true`.
- [ ] Run post-cutover verification (below).
- [ ] Keep local `.env.local` on Free key, `NEXT_PUBLIC_APP_ENV=development`, `API_FOOTBALL_INGEST_ONLY=true`.

**Do not** enable `LIVE_POLLING_ENABLED=true` in the same step unless Phase 5 is ready.

---

## Post-cutover verification

1. **Lineups cron** (Production):

   ```bash
   curl -s "https://scorence.app/api/cron/sync-lineups" \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

   Expect `ok: true` and **not** `skipped: true` due to disabled sync (empty upcoming window may still skip with a reason).

2. **Vercel dashboard** → Cron → confirm `sync-standings` on `0 */6 * * *` and recent successful invocations for `sync-fixtures` / `sync-match-details`.

3. **Local smoke** (optional; temporarily use Pro key in `.env.local` only on your machine):

   ```bash
   npm.cmd run api-football:smoke
   npm.cmd run diagnose:ingestion -- --strict
   ```

4. **UI:** Pinned QA paths in [scripts/INGESTION.md](./scripts/INGESTION.md); standings tab for an allowlisted league (Pro current season).

---

## Rough daily API budget (Pro, after cutover)

Order-of-magnitude for planning ([Tech.md §9.3](./Tech.md), [§23.2](./Tech.md)):

| Job                  | Cadence         | ~Requests/run                                                         |
| -------------------- | --------------- | --------------------------------------------------------------------- |
| `sync-fixtures`      | Daily 04:00 UTC | ~15 (7-day window, allowlist)                                         |
| `sync-standings`     | Every 6h        | ~7 × 4 ≈ 28/day                                                       |
| `sync-lineups`       | Every 15 min    | Variable (fixtures in ≤90 min window; batch cap `LINEUPS_SYNC_BATCH`) |
| `sync-match-details` | Daily           | Batch of FT fixtures                                                  |
| Live polling         | Phase 5         | Highest priority in quota logic                                       |

Pro tier: **7,500 req/day**, **300 req/min** in production ([`getApiFootballMinuteLimit`](../lib/env.ts)).

---

## Related docs

- [Ingestion ops (dev)](./scripts/INGESTION.md) — `diagnose:ingestion`, `ingest:dev-qa`, pinned fixtures
- [ROADMAP — API-Football Pro cutover](./ROADMAP.md#api-football-pro-key--cutover)
- [Live polling (Phase 5)](./LIVE_POLLING.md)
- [Tech — cron & budget](./Tech.md)
