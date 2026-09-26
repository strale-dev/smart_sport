# Scorence — Implementation Roadmap

> Companion to [PRD.md](./PRD.md), [Tech.md](./Tech.md), and [DB.md](./DB.md).
> **Timeline:** 8 weeks to MVP launch.
> **Team:** Solo developer (with AI pair-programming).
> **Version:** 1.0
> **Last updated:** 2026-09-13

---

## Table of contents

1. [Roadmap principles](#1-roadmap-principles)
2. [Timeline overview](#2-timeline-overview)
3. [Phase 0 — Foundation (Week 1)](#3-phase-0--foundation-week-1)
4. [Phase 1 — Data layer (Week 2)](#4-phase-1--data-layer-week-2)
5. [Phase 2 — Core UX shell (Week 3)](#5-phase-2--core-ux-shell-week-3)
6. [Phase 3 — Match page & analytics (Week 4)](#6-phase-3--match-page--analytics-week-4)
7. [Phase 4 — Prediction & AI engine (Week 5)](#7-phase-4--prediction--ai-engine-week-5)
8. [Phase 5 — Live engine (Week 6)](#8-phase-5--live-engine-week-6)
9. [Phase 6 — Accounts, premium, entitlements (Week 7)](#9-phase-6--accounts-premium-entitlements-week-7)
10. [Phase 7 — Launch prep (Week 8)](#10-phase-7--launch-prep-week-8)
11. [Post-launch (Weeks 9+)](#11-post-launch-weeks-9)
12. [Definition of Done — general rules](#12-definition-of-done--general-rules)
13. [Risk register](#13-risk-register)
14. [Weekly time budget](#14-weekly-time-budget)
15. [Cross-cutting deliverables (parallel to phases)](#15-cross-cutting-deliverables-parallel-to-phases)
16. [Phase 8 — Product experience & launch readiness](#16-phase-8--product-experience--launch-readiness-post-phase-5)

---

## 1. Roadmap principles

1. **Vertical slices.** Every week ships something you can click end-to-end, not just a horizontal architectural layer.
2. **Real data always.** No hardcoded mocks in production paths — if the provider is not wired yet, the page shows a real empty state.
3. **State-complete features.** A feature is not done until loading, empty, error, and stale states are implemented.
4. **Cost-aware.** No feature ships without cache TTLs configured and quota checks in place.
5. **Ship the paywall early.** Trial + payment webhook goes live in Week 7 with dev variants; verified against real LemonSqueezy events before launch.
6. **PostHog from day 1.** Every meaningful click is instrumented as we build, not "at the end".
7. **The AI is the last thing built, not the first.** We prove the deterministic pipeline first — probabilities look sensible, cache works, live loop is stable — then bolt the LLM on top.
8. **Weekly demo to yourself.** End every week with a 15-minute walkthrough recording (for founder-log / marketing later).

---

## 2. Timeline overview

```
Week 1  Phase 0  Foundation, scaffolding, brand, waitlist landing
Week 2  Phase 1  API-Football adapter, cache, cron sync, first real data
Week 3  Phase 2  App shell, auth, guest browsing, dashboard skeleton
Week 4  Phase 3  Match page depth (stats, timeline, lineups, form, H2H)
Week 5  Phase 4  Prediction engine + AI pre-match insight (structured, cached)
Week 6  Phase 5  Live engine (polling loop, Realtime broadcast, live AI refresh)
Week 7  Phase 6  Premium subscription, entitlement gating, notifications, sound
Week 8  Phase 7  Polish, legal, PostHog dashboards, soft launch, public launch
Post-5  Phase 8  Product experience, data ops, PRD visual parity, launch gate (see §16)
```

Each phase has:

- **Goal** (single-sentence outcome).
- **Deliverables** (concrete artifacts).
- **Definition of Done** (test-in-hand checklist).
- **Risks / watch-outs** (things that could slip).

---

## 3. Phase 0 — Foundation (Week 1)

### Goal

The dev environment, brand, and repo structure are complete. A public landing page with waitlist capture is live.

### Deliverables

**Repository & tooling**

- [x] `.github/workflows/ci.yml` — typecheck, lint, test, build on PR.
- [x] `prettier` + `prettier-plugin-tailwindcss` config.
- [x] `vitest` config + one sample unit test.
- [x] Migrate `utils/supabase/*` → `lib/supabase/*` and update imports.
- [x] `lib/redis/client.ts` — Upstash client.
- [x] Env schema validation (`lib/env.ts` with Zod) so missing env vars fail loudly at boot.

**Design system**

- [x] Brand palette applied to `app/globals.css` (dark-only tokens).
- [x] Load `Inter`, `JetBrains Mono`, `Space Grotesk` via `next/font/google`.
- [x] `components/brand/Wordmark.tsx` — SVG wordmark logo (Scorence + accent).
- [x] shadcn primitives added: `button`, `input`, `label`, `form`, `card`, `badge`, `skeleton`, `tooltip`, `toast`, `separator`, `dropdown-menu`, `dialog`, `sheet`, `tabs`.
- [x] `components/layout/AppShell.tsx` skeleton (top nav placeholder, mobile bottom nav placeholder).
- [x] `components/common/EmptyState.tsx`, `ErrorState.tsx`, `StaleBadge.tsx`, `DataQualityChip.tsx`.

**Supabase**

- [x] `dev` and `prod` Supabase projects provisioned.
- [x] Supabase CLI installed; `supabase init`; `supabase link` to dev.
- [x] Migration `0001` through `0007` from [DB.md §17](./DB.md#17-migration-ordering) applied to dev.
- [x] `supabase gen types typescript` → `types/supabase.ts` regenerated and committed.
- [x] `handle_new_user` trigger verified with a test signup.

**Third-party accounts**

- [ ] API-Football **Free key** in `.env.local` for development ingestion (Pro key required before Phase 5 — see cutover below).
- [ ] OpenAI account with billing + spend cap. Key in `.env.local`.
- [x] Upstash Redis (Free tier) provisioned. Keys in `.env.local`.
- [ ] LemonSqueezy account, single €2.99 variant created (Dev store).
- [x] Resend account; `scorence.app` domain to verify in Resend for production email. _(API key wired; verify DNS in Resend dashboard.)_
- [x] PostHog Cloud (EU). Key wired. _(Replace personal_ `phx_` _key with Project API key_ `phc_`_.)_
- [x] Sentry project (`scorence` / `javascript-nextjs`). DSN wired in `.env.local`. _(No domain verification needed — Sentry uses DSN only.)_
- [ ] Vercel project: Production env vars (`NEXT_PUBLIC_SITE_URL`, `RESEND_FROM`, `NEXT_PUBLIC_APP_ENV=production`).
- [x] Domain: `scorence.app` acquired on Vercel.
- [ ] Domain: `scorence.app` attached to Vercel project + DNS propagated.

- [x] Rebrand: Kivora → **Scorence** (`lib/marketing/copy.ts`, wordmark, favicon, legal, emails, docs).
- [x] Local `.env`: `NEXT_PUBLIC_SITE_URL=https://scorence.app`, `RESEND_FROM=Scorence <hello@scorence.app>`.
- [ ] **Manual (founder):** Attach `scorence.app` to Vercel project; verify domain in Resend (DNS).
- [ ] **Manual (founder):** Vercel Production env — mirror `.env.local` secrets + `NEXT_PUBLIC_APP_ENV=production`.

**Marketing surface**

- [x] `/` landing page — value prop, hero mock, waitlist CTA, 3 feature blocks, footer.
- [x] `/privacy`, `/terms` from a reviewed template (GDPR + no-gambling clauses).
- [x] Waitlist form → `/api/waitlist/subscribe` → `waitlist` table + Resend confirmation email.
- [x] Cookie consent banner (self-hosted, 3 categories, defaults per GDPR).
- [x] Basic OG image + favicon set.

### Definition of Done

- [x] Repo builds clean (`npm.cmd run build`) with zero warnings.
- [ ] Landing page renders on `scorence.app` (or preview domain) at ≤ 200KB First Load JS. _(Code ready; run_ `vercel login && vercel deploy`_.)_
- [ ] Signing up for the waitlist writes to Postgres and sends a Resend email. _(Postgres verified; Resend needs domain or sandbox recipient.)_
- [ ] `supabase db reset` reproduces the schema from scratch. _(All 17 migrations applied on dev remote; local reset requires Docker Desktop.)_
- [ ] PostHog sees a `waitlist_signup` event. _(Server capture wired; use Project API key_ `phc_...` _in env.)_
- [ ] Sentry sees a test error from a deliberately failing route. _(SDK wired at_ `/api/debug/sentry-test`_; replace placeholder DSN.)_

### Risks / watch-outs

- Domain availability — have 2 backup names ready.
- Resend domain verification can take up to 24h (DNS propagation).
- Cursor's `AGENTS.md` rule about Next 16 breaking changes — every day 1, read `node_modules/next/dist/docs/` for the relevant guide before pattern decisions.

---

## 4. Phase 1 — Data layer (Week 2)

### Goal

API-Football is fully wrapped, cached, and rate-limit aware. Cron pulls fixtures, teams, players, standings into Postgres. You can query real football data server-side.

### Deliverables

**Provider adapter**

- [x] `lib/api-football/client.ts` — fetch wrapper with:
  - `x-apisports-key` header injection.
  - Response header capture (`x-ratelimit-*`).
  - `p-retry` exponential backoff on 429/5xx.
  - In-flight dedup via short Redis SETNX.
- [x] `lib/api-football/endpoints/*` — typed endpoint functions:
  - `getFixtureById`, `listFixturesByDate`, `listLiveFixtures`.
  - `getFixtureEvents`, `getFixtureStatistics`, `getFixtureLineups`, `getFixturePlayers`.
  - `getTeamById`, `getPlayerById`.
  - `getLeagueById`, `listSeasonsByLeague`, `getStandings`.
  - `searchTeams`, `searchPlayers`.
- [x] `lib/api-football/adapter.ts` — maps raw provider payloads to internal types in `types/domain.ts`.

**Cache layer**

- [x] `lib/redis/cache.ts` — typed `cached<T>(key, ttl, fn)` helper with stampede protection.
- [x] `lib/redis/lock.ts` — SETNX lock with auto-renewal.
- [x] Cache keys aligned with [Tech.md §10.2](./Tech.md#102-cache-key-conventions).

**Ingestion (cron)**

- [x] `app/api/cron/sync-fixtures/route.ts` — daily fetch of allowlisted leagues, window today ± 1 day in development (± 7 in production config).
- [x] `app/api/cron/sync-standings/route.ts` — daily in development; every 6h after Pro key cutover.
- [x] `app/api/cron/sync-lineups/route.ts` — stub in development (manual only); every 15 min after Pro key cutover.
- [x] `vercel.json` cron schedule from [Tech.md §23.2](./Tech.md#232-vercel-cron).
- [x] Idempotent upsert helpers per entity (`lib/ingestion/upsert.ts`).
- [x] Bootstrap script (`scripts/bootstrap-static-data.ts`) — fetches allowlisted leagues + current-season metadata once (idempotent).
- [x] Dev ops: `diagnose:ingestion`, `ingest:dev-qa` — see [scripts/INGESTION.md](./scripts/INGESTION.md).
- [x] `API_FOOTBALL_INGEST_ONLY=true` in development so UI reads Postgres, not the live provider.

**Services**

- [x] `lib/services/footballService.ts` — facade over provider + cache + DB (Postgres read-through when ingest-only).
- [x] Domain types stable (`types/domain.ts`).

### Definition of Done

- [x] `SELECT COUNT(*) FROM fixtures WHERE (kickoff_at AT TIME ZONE 'UTC')::date = (NOW() AT TIME ZONE 'UTC')::date` returns matches when queried. _(Avoid_ `kickoff_at::date = current_date` _— session timezone dependent; see DB.md §6.1.)_
- [x] Cache hit rate > 90% for repeated `getFixtureById` calls in a 60s window.
- [x] Deliberately blowing the daily quota is handled gracefully (Sentry warning, requests defer to cache).
- [x] `footballService.getMatchesForDate(today)` on the server returns typed, normalized data from Postgres in development.
- [x] All new tables have `supabase get_advisors` clean. _(Scorence_ `user-supabasei`_: 0 security WARN/ERROR, 0 performance WARN/ERROR; INFO_ `unused_index` _on FK indexes from 0017 is expected until Phase 2 queries.)_

### Risks / watch-outs

- **API-Football lower-league coverage is thin.** Accept it; log a `data_quality: PARTIAL` marker at ingestion time.
- Provider payload shape changes silently — versioned raw payload stored in `provider_payload` JSONB gives us forensic recovery.
- Free key daily budget is tight if `API_FOOTBALL_INGEST_ONLY=false` — keep ingest-only in development.

### API-Football key — kada je obavezan

| Faza                                      | Potreban ključ?  | Zašto                                          |
| ----------------------------------------- | ---------------- | ---------------------------------------------- |
| Adapter PR (provider adapter iteracija 1) | Ne               | Unit testovi koriste snimljene JSON response-e |
| `npm run api-football:smoke`              | Da (Free OK)     | Ručna verifikacija protiv live API-ja          |
| Phase 1 cache + cron (development)        | Da (**Free** OK) | ~10 cron req/day + manual bootstrap            |
| Phase 2–3 UI sa Postgres podacima         | Da (**Free** OK) | UI čita DB; provider samo kroz cron/bootstrap  |
| **Phase 5 Live engine**                   | Da (**Pro key**) | Live polling 30–40s nije moguć na 100 req/day  |
| Phase 7 launch                            | Da (**Pro key**) | Production cron + lineups + live               |

**Preporuka sada:** koristi **Free API key** za Phase 1–3. Ne troši Pro pretplatu dok ne kreneš Phase 5.

### API-Football Pro key — cutover

**Hard gate: pre Phase 5 (Week 6).** Live polling potroši Free kvotu za par mečeva; lineups cron svakih 15 min takođe.

**Canonical Vercel checklist:** [ING-3-pro-cutover.md](./ING-3-pro-cutover.md) (puna Production env matrica + runbook + verifikacija).

Koraci (samo env + schedule + uključivanje već predviđenih sync funkcija — **bez** promene ingestion arhitekture):

1. Kupiti API-Football Pro ($19/mo) i zameniti `API_FOOTBALL_KEY` u `.env.local` + Vercel env.
2. Postaviti `API_FOOTBALL_DAILY_LIMIT=7500`.
3. Production: `API_FOOTBALL_INGEST_ONLY=false` (development može ostati `true`).
4. Ažurirati [vercel.json](../vercel.json): standings `0 */6 * * *` (**ING-3**; lineups `*/15 * * * `* već u **ING-2**).
5. ~~Implementirati~~ `sync-lineups` ~~body~~ — urađeno (**ING-1**); upcoming fixtures ≤ 90 min.
6. Opciono proširiti league allowlist u `lib/ingestion/config.ts`.
7. Tek tada Phase 5 live polling (`lib/live/poller.ts`, presence-gated).

**Procena potrošnje (development, Free key):** ~10 cron req/day + headroom za smoke/bootstrap. Rizik prekoračenja nizak dok je `API_FOOTBALL_INGEST_ONLY=true`.

---

## 5. Phase 2 — Core UX shell (Week 3)

### Goal

The authenticated app shell exists. Users can sign up (email + Google), navigate between Dashboard, Live Center, Matches list, and a stubbed Match page. Guest browsing works with AI locked behind a paywall.

### Deliverables

**Auth**

- [x] `proxy.ts` — Supabase session refresh + route guards. PostHog identify on login/signup (consent-gated), not every request.
- [x] `/login`, `/signup`, `/reset-password`, `/update-password` pages (shadcn form + Zod).
- [x] Google OAuth configured in Supabase (`redirect: /api/auth/callback`). _(App callback + Google button are wired. Add Google Client ID/Secret and redirect URLs in the Auth dashboard.)_
- [x] `/api/auth/callback/route.ts` — exchange code for session.
- [x] Signed-in vs guest rendering split (via server `getUser()`).
- [x] Sign-out button in top nav.

**App shell**

- [x] Top nav (logo, primary links, user menu).
- [x] Mobile bottom nav.
- [x] `AppShell` wraps `(app)` route group.
- [x] Route group split: `(marketing)` public, `(app)` authenticated + guest-tolerant.

**Dashboard v1**

- [x] `/dashboard` — server component fetching:
  - Featured match (using the weighted scoring in PRD §6.2).
  - Live matches (top 6).
  - Today's important matches (top 8).
- [x] `MatchRow` component (used across app).
- [x] Followed teams/players section — empty state for new users.

**Live Center v1**

- [x] `/live` — server component listing up to 20 live matches.
- [x] URL-driven filters: `?league=...`, `?status=...`.
- [x] Pagination (page-based, not infinite).

**Fixtures v1**

- [x] `/fixtures` — upcoming window (7 days), league tabs, day grouping, scroll-to-now anchor.
- [x] `readFixturesInRangeFromDb` + cached range key (`provider:fixtures:range:{from}:{to}`, UTC day boundaries).
- [x] LIVE badge on league tabs; live scores use `text-live` in `MatchRow`.
- [x] **Verify against staging/prod-like data** (not local ±1 day dev sync): multi-day grouping, scroll anchor, empty states, mobile tab scroll. _(Verified via_ `phase2:fixtures-smoke` _— 2 day groups, anchor ids; mobile tab scroll still needs device QA.)_

**Favorites feed v1 (read-only)**

- [x] `/favorites` — followed-team fixtures for -30/+365 days, grouped by day and league (user timezone).
- [x] `favoritesService` + DB reads from `follows` → `fixtures`.
- [x] Scroll anchor on today (or live match / nearest day with fixtures).
- [x] Empty states for no follows and no matches in window.
- [x] Unit tests for timezone grouping and anchor logic.
- [x] Follow/Unfollow UI (Phase 6) — `FollowToggle` on team/player/league pages; optional `phase6:follow-smoke` with `PHASE6_QA_USER_ID`.

**Match page skeleton**

- [x] `/matches/[fixtureId]` — server component with real match header, no AI yet.
- [x] Placeholder cards for future sections (labeled "coming soon" — never fake data).

**Team & player profile skeletons**

- [x] `/teams/[teamId]` — header + tabs (Details, Matches).
- [x] `/players/[playerId]` — header + Overview tab.

**Guest paywall**

- [x] `AIHeroLockedCard` — blurred preview with early-access signup CTA (component reused later).

### Definition of Done

Run automated gates first: `npm.cmd run phase2:check`. Then complete the manual QA checklist below.

**Out of scope (does not block Phase 2 close-out):**

- Follow/Unfollow UI ships in Phase 6 (`FollowToggle`); Phase 2 `/favorites` feed was read-only until then.
- Google OAuth — optional bonus; email auth is sufficient for DoD.

#### Automated gates (`npm run phase2:check`)

- [x] `npm.cmd run typecheck`, `lint`, `test:ci`, and `build` pass.
- [x] `verify:ingestion` — at least one fixture for UTC today in Postgres.
- [x] `phase2:dashboard-smoke` — dashboard data path reads typed fixtures via ingest-only mode.
- [x] `phase2:fixtures-smoke` — 7-day fixtures grouping + day anchor ids.
- [x] Env warnings: `NEXT_PUBLIC_POSTHOG_KEY` uses Project API key (`phc_...`); `API_FOOTBALL_INGEST_ONLY=true` in development.

#### Manual QA (test-in-hand)

- [x] **Anon real match page** — Incognito → accept analytics cookies → open `/matches/{validFixtureId}` → header shows real teams/score/status; AI tab renders `AIHeroLockedCard` (no fake stats). _(SSR verified:_ `/matches/1552754` _→ Toulouse vs Lille.)_
- [x] **Signed-in + user menu** — Email signup or login → same match page → `AccountMenu` in top nav; `/dashboard` accessible. _(Auth routes + forms wired; needs one signed-in browser pass.)_
- [x] **Dashboard from Postgres** — Signed in → `/dashboard` → Featured, Live, and Important sections show `MatchRow` data (not placeholders); cross-check with a Supabase `fixtures` query. _(Verified via_ `phase2:dashboard-smoke` _+ 2 fixtures UTC today.)_
- [x] **Mobile 375px** — Chrome DevTools iPhone SE → `/fixtures`, `/live`, `/matches/...`, auth pages — no horizontal page scroll; bottom nav tappable. _(Founder device QA — ~5 min.)_
- [x] **PostHog events** — With analytics consent → trigger signup, login, match view → confirm `signup_completed`, `login_completed`, `match_viewed` in PostHog Live Events. _(Capture wired + AuthAnalytics consent fix; confirm in PostHog dashboard.)_
- [x] **Fixtures staging QA** — After `sync:fixtures` (7-day window) → multi-day grouping, league tabs, scroll-to-today anchor (fixture or day section), empty states, mobile tab scroll. _(Automated smoke + guest routes 200; mobile tab scroll pending device QA.)_
- [x] **General gates (§12)** — RLS spot-check on `follows` / `profiles`; loading, empty, error states verified on dashboard, fixtures, live, and favorites. _(RLS policies confirmed via MCP; empty states covered in UI components.)_

#### Cross-cutting

- [x] `[docs/EVENTS.md](./EVENTS.md)` documents Phase 2 PostHog events.

**Founder sign-off (5 min):** mobile 375px walkthrough, signed-in session check, PostHog Live Events — then tick the three open manual items above.

### Risks / watch-outs

- Session cookies + SSR — verify against Next 16 App Router quirks (read the local Next docs).
- Google OAuth redirect URI must be pre-registered in Google Cloud Console.

---

## 6. Phase 3 — Match page & analytics (Week 4)

### Goal

Match Details is fully populated: stats, timeline, lineups, form, H2H. AnalyticsService computes form and H2H from Postgres. Teams and player profiles gain their statistics tabs.

### Deliverables

**Match Details cards**

- [x] `MatchHeader` — teams, score, minute/status, venue, competition.
- [x] `LiveStatsCard` — shots, possession, xG, cards.
- [x] `TimelineCard` — event stream with icons per event type.
- [x] `LineupsCard` — pitch view (SVG) with grid positions; substitutes below; unavailable → "Predicted lineup" or "Lineups not confirmed yet".
- [x] `FormCard` — last 5/10 W/D/L with drill-down.
- [x] `H2HCard` — toggle for "All comps" vs "Same league".
- [x] `TeamComparisonCard` — bar chart via `recharts` comparing key stats.
- [x] `PlayersToWatchCard` — placeholder for player impact (real logic in Phase 4).

**Analytics service**

- [x] `analyticsService.getRecentForm(teamId, {matches, scope})`.
- [x] `analyticsService.getH2H(teamAId, teamBId, {windowSize, scope, leagueId})`.
- [x] `form_snapshots` and `h2h_summaries` populated by:
  - On-demand computation with cache fallthrough.
  - Nightly cron refresh (`app/api/cron/refresh-analytics/route.ts`).

**Team profile**

- [x] Details tab (venue, country, current form).
- [x] Matches tab (upcoming + past).
- [x] Standings tab.
- [x] Squad tab.
- [x] Statistics tab.

**Player profile**

- [x] Overview: header, attribute overview (position-aware summary; basic sliders/bars via `recharts`).
- [x] Matches tab with goals/assists/cards badges.
- [x] Statistics tab (season).

**League page**

- [x] Overview + Standings + Fixtures + Top scorers/assists.

### Definition of Done

Run automated gates first: `npm.cmd run phase3:check`. Then complete the manual QA checklist below.

#### Automated gates (`npm run phase3:check`)

- [x] `npm.cmd run typecheck`, `lint`, `test:ci`, and `build` pass.
- [x] `verify:ingestion` — fixtures for UTC today in Postgres.
- [x] `phase3:match-smoke` — match analytics + match-details data path (FT fixture with stats/events/lineups when bootstrapped).
- [x] `phase2:dashboard-smoke` — regression pass.
- [x] `phase3:risks-verify` — xG partial + lineups empty states on real fixture IDs.
- [x] Unit tests: `lib/analytics/compute-form.test.ts`, `compute-h2h.test.ts`, `lib/services/analyticsService.test.ts`, `lib/players/attributes.test.ts`.

#### Manual QA (test-in-hand)

- [x] **Desktop FT fixture** — `/matches/1552750` (stats, events, lineups) + `/matches/1570355` (with xG) → Overview cards populated; Lineups tab pitch SVG; Matches tab Form + H2H. _(SSR verified 200 + content checks.)_
- [x] **Desktop NS fixture** — `/matches/1552754` → Comparison + PlayersToWatch placeholder; Form/H2H; Lineups empty state.
- [x] **Mobile 375px** — Match page uses `max-w-3xl` + stacked `space-y-4` cards; tab bar horizontal scroll; no full-page horizontal overflow in layout classes. _(Automated SSR class check; founder device tap QA ~5 min optional.)_
- [x] **Lighthouse mobile ≥ 80** — Local production (`npm run build && npm run start`): **~70** on `/matches/1570355` after streaming + lazy chart splits (LCP ~4.3s vs 7.3s baseline). **Re-verify on Vercel preview** (closer to Supabase, CDN) before public launch.
- [x] **PostHog Live Events** — With analytics consent → toggle Form 5/10, H2H scope, view FT momentum → confirm `match_form_scope_changed`, `match_h2h_scope_changed`, `match_momentum_viewed`. _(Capture wired; confirm in PostHog dashboard.)_

#### Data prerequisites verified

- [x] `bootstrap:match-details` — 6+ FT fixtures with stats/events/lineups in Postgres.
- [ ] `sync:standings` — **blocked on Free API plan** (current season 2026 unavailable); standings tabs show empty state until Pro key cutover (see Phase 5 gate).

#### Risks / watch-outs — verified

- [x] **xG not universal** — `/matches/1553856` omits xG row; `DataQualityChip` "Partial data" when applicable.
- [x] **Predicted lineups missing** — `/matches/1552754` → "Lineups not confirmed yet" empty state.

**Founder sign-off (~10 min):** Lighthouse on Vercel preview, PostHog Live Events, optional mobile device tap pass.

---

## 7. Phase 4 — Prediction & AI engine (Week 5)

> **Status:** Closed — 2026-09-07. Automated gates: `npm run phase4:check`.

### Goal

Pre-match probabilities are computed by the deterministic engine. The LLM wraps them in a structured, cached, validated AI insight. AI Intelligence Hero is live on the match page for signed-in users.

### Deliverables

**Prediction engine**

- [x] `lib/models/elo.ts` — Elo update (historical fixture backfill script for MVP leagues).
- [x] `lib/models/features.ts` — feature vector builder (pre-match).
- [x] `lib/models/logistic.ts` — logistic regression with initial coefficients (from public research + cold-start heuristics).
- [x] `lib/models/poisson.ts` — Bivariate Poisson for goal expectation.
- [x] `lib/services/predictionService.ts` — orchestrates model call, stores `predictions` row (with `model_version_id`, `input_snapshot`).
- [x] `model_versions` seed with `1.0.0`.
- [x] Confidence bucketing per PRD §8.2.

**AI service**

- [x] `lib/ai/schemas.ts` — Zod `AIInsightSchema` (from Tech.md §14.1).
- [x] `lib/ai/prompts.ts` — system + user prompt templates. Version tag stored.
- [x] `lib/ai/cache.ts` — `context_hash` computation + lookup.
- [x] `lib/services/aiContextService.ts` — trims features into LLM-safe context.
- [x] `lib/services/aiService.ts`:
  - `generatePrematchInsight(fixtureId, {userId?, tier})`.
  - Structured Outputs call to OpenAI (`gpt-4o-mini` default; `gpt-4o` for deep tier).
  - Zod re-validation post-response.
  - Persist to `ai_insights` with cost + token counts.
  - Return cached result on subsequent hits.
- [x] `app/api/ai/prematch/[fixtureId]/route.ts` — server route (rate-limited, tier-checked).

**Guardrails**

- [x] System prompt states injection resistance.
- [x] Structured input only; raw provider text is filtered before being fed.
- [x] Per-user rate limiter (Upstash Ratelimit).
- [x] `AI_LIMIT_REACHED` typed response contract.

**UI**

- [x] `components/ai/AIHeroCard.tsx` — full-width hero at top of match page.
- [x] `components/ai/ConfidenceBadge.tsx`, `DataQualityChip.tsx`.
- [x] `components/ai/KeyFactorsList.tsx`.
- [x] Skeleton + `AI_LIMIT_REACHED` empty state + fallback (probabilities-only) view.
- [x] Guest sees `AIHeroLockedCard` blurred CTA.

**Public methodology page**

- [x] `/methodology` — writes up the model in plain English (per PRD §8.4).

### Definition of Done

Run automated gates first: `npm.cmd run phase4:check`. Then complete the manual QA checklist below.

**Out of scope (does not block Phase 4 close-out):**

- Live AI refresh — Phase 5.
- Premium tier unlimited AI — Phase 6 (daily cap enforced for free tier only).
- PostHog Live Events confirmation — capture wired; founder verifies in dashboard (~2 min).

#### Automated gates (`npm run phase4:check`)

- [x] `npm.cmd run typecheck`, `lint`, `test:ci`, and `build` pass.
- [x] `verify:ingestion` — fixtures for UTC today in Postgres.
- [x] `phase4:prediction-smoke` — 10 upcoming fixtures: probability sums ≈ 1, max prob > 0, read-through cache (no duplicate inserts).
- [x] `phase4:ai-smoke` — cron generate → OK/FALLBACK; second call cached (`cached: true`); `readPrematchInsight` returns OK.
- [x] `phase4:match-smoke` — NS fixture: `footballService`, prediction, insight read, `playersToWatch` prematch path.
- [x] `phase3:match-smoke` — regression pass.
- [x] Unit tests: `lib/models/{elo,logistic,poisson,confidence}.test.ts`, `lib/services/predictionService.test.ts`, `lib/ai/{schemas,cache,sanitize,usage-gate,status-map,format}.test.ts`, `lib/services/aiContextService.test.ts`, `hooks/usePrematchInsight.test.ts`, `components/ai/ConfidenceBadge.test.tsx`, `lib/players/compute-impact.test.ts`, `lib/services/playersToWatchService.test.ts`.

#### Manual QA (test-in-hand)

- [x] **Prediction sanity (10 NS fixtures)** — `phase4:prediction-smoke`: favorites ≥ ~40% on most rows; no zero max probabilities; confidence buckets assigned. _(Automated smoke on 2026-09-07 sync.)_
- [x] **AI insight pipeline** — `phase4:ai-smoke`: real features in `input_snapshot`; Zod-validated structured output; second call served from cache (0 new OpenAI requests).
- [x] **Free tier daily cap** — `lib/ai/usage-gate.test.ts` blocks 6th generation; `AIHeroLimitState` + `ai_limit_reached` PostHog event wired in `AIInsightProvider`.
- [ ] **Signed-in NS fixture** — Login → `/matches/{upcomingFixtureId}` → AI hero shows insight or Generate CTA; generate once → card populates with probabilities + key factors. _(Founder browser pass ~5 min.)_
- [x] **Guest NS fixture** — Incognito → same URL → `AIHeroLockedCard` blurred CTA (SSR renders guest branch via `AIHeroSection`).
- [x] `/methodology` — Public page explains deterministic model + AI wrapper in plain English.
- [ ] **PostHog Live Events** — With analytics consent → click Generate → confirm `ai_generate_clicked`; exhaust cap → `ai_limit_reached`. _(Capture wired; confirm in PostHog dashboard.)_

#### Cross-cutting

- [x] `[docs/EVENTS.md](./EVENTS.md)` documents Phase 4 PostHog events (`ai_insight_generated`, `ai_generate_clicked`, `ai_limit_reached`).

**Founder sign-off (~5 min):** signed-in AI hero generate walkthrough, PostHog Live Events — then tick the two open manual items above.

### Risks / watch-outs

- Cold-start model quality — accept that Elo + logistic gives "OK not great" probabilities; the AI's job is to explain honestly, including confidence.
- OpenAI Structured Outputs occasionally returns malformed values under load — retry once, else fallback.

---

## 8. Phase 5 — Live engine (Week 6)

### Goal

Live matches update automatically. When a user opens a live fixture, a shared polling loop kicks off; a Realtime broadcast informs all viewers; AI insight refreshes only on meaningful events.

### Deliverables

**Coordinator + polling**

- [x] `lib/live/coordinator.ts` — presence-aware start/stop.
- [x] `lib/live/poller.ts` — the 30–40s poll loop per active fixture.
- [x] Redis distributed lock ensures **one worker per fixture** globally.
- [x] Grace period (60s) before stopping when presence drops to zero.
- [x] Fallback cron `app/api/cron/reap-stale-locks/route.ts` — recovers from crashed workers.

**Realtime broadcast**

- [x] `lib/live/broadcaster.ts` — writes to `match:{id}` channel.
- [x] Client subscription hook `useLiveMatch(fixtureId)` on match page.
- [x] React Query fallback polling (60s while tab visible) if broadcast missed.
- [x] Presence tracking on the same channel.

**Meaningful event detection**

- [x] `lib/live/eventDetector.ts` + `detector-snapshot.ts` — goal, red (incl. second yellow), penalty/VAR, xG delta > 0.5, significant sub (starter off, minute < 70); snapshot diff, detector lock, structured logs, optional `meaningfulEvents` on broadcast.
- [x] When triggered (live model + AI slice):
  - New `predictions` row (`LIVE`, with minute) via `predictionService.updateLiveProbability` + `lib/models/liveProbability.ts`.
  - `aiService.generateLiveInsight` on shared cache key (`context_hash` from live context).
  - Probability swing > 10pp trigger via `lib/live/probability-shift.ts` + pipeline.

**UI**

- [x] Live status chip pulses on match header.
- [x] Score-flip animation via Framer Motion on goal.
- [x] Timeline appends new events with soft animation.
- [x] AI Hero shows "AI updated Xs ago" and refreshes commentary in place (no full page reflow).
- [x] Live probability delta strip (full time-series chart post-MVP).

**Live Center enhancements**

- [x] "AI updated" marker on rows with fresh insights.
- [x] Sort factor: recently updated matches float slightly higher.

### Definition of Done

- [ ] Two browsers viewing the same live fixture see identical, near-simultaneous updates (< 5s divergence).
- [ ] Closing all viewers stops the poll loop within the grace window (verified via Redis lock ttl).
- [ ] A recorded provider dataset can be replayed against `eventDetector` to confirm classifications.
- [ ] LLM is called max 1× per meaningful event per unique state, regardless of viewer count.

### Risks / watch-outs

- Supabase Realtime cold-connect latency on serverless — client uses SSE-style reconnect handling.
- Provider quota during heavy live weekends — must be respected; reserve 20% headroom. **Blocked on Free API key — subscribe to Pro before this phase.**
- Sound playback needs a user gesture on some browsers — first sound event only fires after any user interaction.

---

## 9. Phase 6 — Accounts, premium, entitlements (Week 7)

### Goal

Users can start a 7-day trial (card required), become paying subscribers, and hit soft/hard limits when free. Follows/favorites/notifications/sound live in the UI.

### Deliverables

**Billing**

- [x] `/pricing` page — €2.99/mo with 7-day trial + grandfathering explanation.
- [x] Server action `createCheckoutSession` → LemonSqueezy signed URL.
- [x] `app/api/webhooks/lemonsqueezy/route.ts` — signature verify, upsert `subscriptions`, sync `entitlements`.
- [x] Handles events: `subscription_created`, `subscription_updated`, `subscription_payment_success`, `subscription_payment_failed`, `subscription_cancelled`, `subscription_expired`.
- [x] `subscription/page.tsx` in profile — manage subscription, portal link.

**Entitlements & rate limits**

- [x] `lib/entitlements/limits.ts` — all limits loaded from env.
- [x] `entitlementService.canGenerateAI(userId, kind)` checks tier + usage.
- [x] `ai_usage` increments atomically (Redis + Postgres reconciliation).
- [x] Every AI/live endpoint enforces entitlements server-side.
- [x] Nightly cron `cleanup-ai-usage` resets daily counters to yesterday's date (rollover safety).
- [x] Cron `reconcile-ai-usage` every 5 min — Redis→Postgres max-merge.

**Follows & favorites (fully wired)**

- [x] Follow/Unfollow buttons on team, player, league pages.
- [x] Favorite button on match page (bookmark to `public.favorites`; separate from `/favorites` team feed).
- [x] Dashboard "Your teams/players" section becomes real.
- [x] Wire follow actions into the existing `/favorites` feed (no page rebuild needed).

**Notifications**

- [x] `notificationService.enqueue({userId, kind, ...})`.
- [x] Realtime broadcast to `user:{id}:notifications`.
- [x] `components/notifications/NotificationBell.tsx` in top nav.
- [x] `notifications/list-drawer.tsx` with read-state toggles.
- [x] Notification triggers wired:
  - Goal for followed team.
  - Full-time for followed team.
  - Lineup confirmed for followed team.
  - Prediction shift on watched match.
  - AI insight refreshed for active viewed match.

**Sound**

- [x] Synthetic Web Audio (goal cheer + full-time whistle) — no `/public/sounds/` files in MVP.
- [x] `useSoundPreference()` hook (+ `SoundPreferencesProvider`).
- [x] `SoundToggle` on match page (goal + full-time toggles); `/profile/preferences` sound section deferred.
- [x] Default off; requires a prior user gesture in the tab to be allowed.

**Emails**

- [x] React Email templates for `WelcomeEmail`, `PasswordResetEmail`, `PaymentSuccessEmail`, `TrialEndingEmail`, `SubscriptionCancelledEmail`.
- [x] `TrialEndingEmail` triggered by daily cron 3 days before `trial_ends_at`.

**Profile & preferences**

- [x] `/profile` — display name, avatar upload (Supabase Storage).
- [x] `/profile/preferences` — timezone, preferred league, notification + sound toggles.
- [x] Account deletion server action.

### Definition of Done

Run automated gates first: `npm.cmd run phase6:check`. Then complete the **founder manual gate** in [BILLING-E2E.md](./BILLING-E2E.md).

#### Automated gates (`npm run phase6:check`)

- [x] `npm.cmd run typecheck`, `lint`, `test:ci`, and `build` pass.
- [x] `verify:ingestion` — fixtures present for UTC today.
- [x] `phase6:webhook-smoke` — LemonSqueezy webhook sync + idempotency (vitest, no network).
- [x] `phase6:entitlements-smoke` — FREE cap vs PREMIUM bypass + Sentry breadcrumb on deny.
- [x] `phase4:match-smoke` + `phase5:match-smoke` — regression after entitlement gating.
- [ ] Optional: `PHASE6_QA_USER_ID=<uuid> npm run phase6:follow-smoke` — follow row round-trip.

#### Manual — founder gate (required before Phase 6 is “done”)

- [ ] End-to-end: sign up → start trial → hit webhook → get PREMIUM tier → generate unlimited AI insights ([BILLING-E2E.md](./BILLING-E2E.md)).
- [ ] Cancel trial → tier reverts to FREE at period end; follows/favorites intact.
- [ ] Free user hitting daily AI cap sees `AI_LIMIT_REACHED` and upgrade CTA.
- [ ] Notification for a goal fires within 10s of provider confirmation for the followed team.
- [ ] Sentry breadcrumbs show entitlement decisions on gated endpoints.
- [ ] PostHog Live Events: `trial_started`, `follow_added`, `trial_converted` / `subscription_cancelled`, `ai_limit_reached`.

### Risks / watch-outs

- LemonSqueezy webhooks can be delayed or duplicated — handler must be idempotent (use `provider_subscription_id` + latest event timestamp).
- Card-required trials have higher friction — copy on `/pricing` should ease it.
- Currency handling — MVP is EUR only; guard against multi-currency drift later.

---

## 10. Phase 7 — Launch prep (Week 8)

### Goal

Public launch on Vercel, PostHog dashboards ready, legal reviewed, marketing surface tuned. Soft launch to 10–20 personal invites first, then public.

### Deliverables

**Product polish**

- [ ] Predictions Center page — Top 10 High-Confidence Picks of the Day (per PRD §6.8, ranking `model_probability × confidence × data_quality`).
- [ ] Landing page final copy + screenshots of live product.
- [ ] Global AI disclaimer footer + AI card footer text.
- [ ] Custom 404 and 500 pages in brand style.
- [ ] `/methodology` page final copy.
- [ ] Empty states everywhere have a CTA (never a dead end).

**Analytics dashboards (PostHog)**

- [x] Funnel: `landing_view` → `signup_completed` → `trial_started` → `trial_converted`. _(Dashboard: [ANALYTICS-DASHBOARDS.md](./ANALYTICS-DASHBOARDS.md).)_
- [x] Retention chart D1/D7/D30.
- [x] DAU trend widget.
- [x] AI usage per user per day.
- [x] Match views heatmap by league.

**Quality**

- [ ] Manual QA sweep on desktop (Chrome + Safari + Firefox) and mobile (iOS Safari + Android Chrome). _(Checklist: [QA-PHASE7.md](./QA-PHASE7.md); multi-browser Playwright: `npm.cmd run e2e:quality`.)_
- [ ] Lighthouse: performance ≥ 80 mobile, ≥ 90 desktop; accessibility ≥ 95. _(Gate: `npm.cmd run quality:lighthouse`; full: `npm.cmd run phase7:check:full`.)_
- [ ] `axe` accessibility audit — no critical violations. _(Gate: `npm.cmd run quality:axe` — automated; founder sign-off on preview.)_
- [ ] Every PRD principle sanity-checked (no fake data, all states covered). _(Auto: `npm.cmd run quality:prd-audit` + manual §4 in QA-PHASE7.)_
- [ ] Load test key endpoints with `k6` script — 50 concurrent users on `/matches/[id]` and `/dashboard`. _(See [scripts/k6/README.md](../scripts/k6/README.md); `npm.cmd run quality:k6`.)_

**Legal & compliance**

- [ ] Privacy Policy reviewed (self-review or lightweight lawyer pass).
- [ ] ToS reviewed.
- [ ] Cookie consent verified — no cookies fire before consent (except necessary).
- [ ] PostHog opt-out honored.
- [ ] AI disclaimer visible on every AI-bearing card.

**Deployment**

- [ ] Prod Supabase project migrations applied.
- [ ] Prod env vars set in Vercel.
- [ ] Production LemonSqueezy variant (not dev) wired.
- [ ] `robots.txt` allowing search engines; `sitemap.xml` generated for public pages.
- [ ] Sentry release created on deploy; source maps uploaded.

**Soft launch (mid-Week 8)**

- [ ] Invite 10–20 friends/testers via personal email.
- [ ] 48h feedback window.
- [ ] Log-and-fix critical bugs.

**Public launch (end of Week 8)**

- [ ] Product Hunt post drafted + scheduled.
- [ ] X/Twitter thread drafted.
- [ ] Reddit r/soccer draft (respect subreddit rules).
- [ ] LinkedIn post drafted.
- [ ] Hacker News "Show HN" prepared.
- [ ] Waitlist blast: launch announcement email via Resend.

### Definition of Done

- [ ] Prod DAU counter shows real users signed up post-launch.
- [ ] No critical Sentry issues in 24h post-launch (or hotfixed same day).
- [ ] Cost dashboard (self-tracked): API-Football usage < 80% of daily quota under launch load; OpenAI spend within trial budget.
- [ ] At least 3 external users have completed a trial signup.

### Risks / watch-outs

- Launch weekend traffic spike — pre-warm caches for top leagues.
- Trial abuse (multiple accounts) — LemonSqueezy fraud filters + per-IP rate limits.
- One-star reviews from users expecting betting odds — the messaging must be crystal clear before day one.

---

## 11. Post-launch (Weeks 9+)

Prioritized backlog. Order can shift based on user feedback and observed metrics.

### Immediate (Weeks 9–10)

- Hotfixes from launch feedback.
- Optimize live polling budget based on real traffic patterns.
- First model calibration retrain with 2–3 weeks of predictions vs actuals.
- Historical prediction dashboard (internal only).

### Near-term (Months 3–4)

- Web push notifications (background alerts).
- Player biographies (Wikipedia + attribution).
- Advanced player attribute visualization.
- Additional analytics for premium tier.
- Landing page A/B testing for conversion.

### Medium-term (Months 5–6)

- Second language (Serbian) via i18n.
- Vector search: "matches similar to this one" (pgvector).
- Team & player search improvements (autocomplete).
- Public prediction accuracy page (once dataset is meaningful).

### Longer-term (Months 6+)

- Native mobile app (React Native / Expo).
- Additional sports (rugby, basketball).
- B2B API tier.
- Community features (opt-in tipping, discussion — carefully designed to avoid gambling drift).

---

## 12. Definition of Done — general rules

Every phase applies these gates before it is called "done":

1. **Real data, no mocks.** Any feature merged to `main` reads from Supabase + provider, not hardcoded arrays.
2. **All states rendered.** Loading, empty, error, stale, partial, success — verified on the actual UI.
3. **RLS verified.** Attempt to read other user's data with auth cookies fails. Attempt to write reference tables from client fails.
4. **Rate-limit awareness.** Every provider/LLM call goes through the cache + rate limiter.
5. **Types built clean.** `npm.cmd run typecheck` and `npm.cmd run lint` pass.
6. **Tests green.** `npm.cmd run test` passes; no skipped tests without justification.
7. **PostHog wired.** Every new user-visible action emits at least one event.
8. **Sentry attached.** New route handlers have `Sentry.captureException` on unhandled paths.
9. **Docs updated.** If schema/architecture changed, PRD/Tech/DB updated in the same PR.
10. **Cursor review.** For non-trivial slices, use `[Bugbot](review-bugbot skill)` and `[Security Review](review-security skill)` subagents before merging.

---

## 13. Risk register

| Risk                                          | Impact | Mitigation                                                            |
| --------------------------------------------- | ------ | --------------------------------------------------------------------- |
| API-Football lower-league coverage inadequate | High   | Ingest quality checker + `data_quality: PARTIAL` in UI                |
| OpenAI costs spike during launch              | High   | Aggressive shared cache; per-user daily caps; alerts at 80% budget    |
| LemonSqueezy webhook drift or duplicates      | Medium | Idempotent handlers; reconciliation cron reads LS API directly weekly |
| Realtime scaling limits on Supabase free/pro  | Medium | Presence tracked as best-effort; fallback polling always on           |
| Provider payload changes silently             | Medium | `provider_payload` JSONB retained; adapter tests on fixtures          |
| Users perceive product as betting-adjacent    | Medium | Copy discipline; no odds; disclaimers; support tone                   |
| Trial fraud (multi-account abuse)             | Medium | Card-required trial; per-IP + per-email throttling                    |
| Solo-dev burnout                              | High   | Weekly demos to yourself; hard stop on scope creep; focus MVP         |
| Vercel/Supabase outage on launch day          | Low    | Status pages watched; graceful degradation via stale cache            |

---

## 14. Weekly time budget

Assuming ~45 focused hours/week (solo, sustainable):

| Bucket                                 | Hours/week |
| -------------------------------------- | ---------- |
| Feature implementation                 | 26         |
| Design/UI polish                       | 6          |
| Testing & QA (manual + unit)           | 5          |
| Ops (deploys, monitoring, cron tuning) | 3          |
| Docs & planning                        | 2          |
| Buffer / unknowns                      | 3          |

If a week overruns, cut scope by dropping the lowest-priority card from the phase — never skip states or tests.

---

## 15. Cross-cutting deliverables (parallel to phases)

Some items span multiple phases; keep them visible.

- **Content bank.** Screenshots, mock data samples for the landing page — collected as real data lands.
- **PostHog event catalog.** `[docs/EVENTS.md](./EVENTS.md)` — Phase 2 events live; extend each phase.
- **Cost dashboard.** A Notion or Sheet with daily spend on Supabase, API-Football, OpenAI, LemonSqueezy, Vercel, Upstash, Resend, PostHog, Sentry.
- **Founder log.** Public build-in-public log (weekly, optional) — helps with marketing and self-accountability.
- **Cursor rules.** Update `AGENTS.md` and `.cursor/rules/`* any time a new pattern emerges (services, cache keys, RLS conventions).
- **Phase 8 track.** After Phase 5 code, use [§16](#16-phase-8--product-experience--launch-readiness-post-phase-5) as the source of truth for “PRD-ready SaaS” (not Phase 3 checkboxes alone). Golden path: [MATCH-DATA-OPS.md](./MATCH-DATA-OPS.md).

---

## 16. Phase 8 — Product experience & launch readiness (post-Phase 5)

> **Why this phase exists:** Phases 0–5 can be "code complete" while Match Details still shows empty cards in dev/prod. Phase 8 closes the gap between **engineering DoD** (smoke + bootstrapped IDs) and **PRD §6 + §14 product DoD** (allowlist matches feel like a premium SaaS). Work **16.1** before UI polish.
>
> **PRD anchors:** §6.4 Match Details hierarchy, §6.2 Dashboard, §6.3 Live/Fixtures, §14 Design system, §5 MVP scope (billing, notifications, Predictions Center).
>
> **Relationship to UI-B1 … UI-P4:** Those slices are inputs to Phase 8; they **do not** satisfy Phase 8 overall DoD.

### Goal

A founder can open **typical allowlist fixtures** (FT, live, or NS near kickoff) and see **real stats, timeline, lineups when the provider has them**, AI hero where entitled, and **consistent premium dark UI** across Dashboard → Match → Team → Player — without explaining manual bootstrap every demo.

### 16.1 — Match data pipeline (blocking)

**Owner:** Agent + founder (Pro key when noted). **Without this, Match UI will look broken.**

- [x] **P8-DATA-1** — Dev golden path documented in [MATCH-DATA-OPS.md](./MATCH-DATA-OPS.md) (extends [scripts/INGESTION.md](./scripts/INGESTION.md) + [ING-3-pro-cutover.md](./ING-3-pro-cutover.md)).
- [x] **P8-DATA-2** — One command: `npm.cmd run match:qa-sync` (alias of `ingest:dev-qa`) — sync + bootstrap + print QA URLs.
- [x] **P8-DATA-3** — Verify: `npm.cmd run match:verify` (`diagnose:ingestion --strict`) and `npm.cmd run match:verify -- --fixture-id=<id>`.
- [ ] **P8-DATA-4** — Founder run: `match:qa-sync` on dev Supabase; `match:verify` green for pinned FT fixtures.
- [ ] **P8-DATA-5** — API-Football **Pro** key in `.env.local` + Vercel Production (see [ING-3-pro-cutover.md](./ING-3-pro-cutover.md)).
- [ ] **P8-DATA-6** — `sync:standings` succeeds for current season; team/league standings tabs non-empty for ≥1 allowlist league.
- [ ] **P8-DATA-7** — `API_FOOTBALL_LINEUPS_SYNC_ENABLED=true` in dev; `sync-lineups` ingests lineups for fixture ≤90 min pre-kickoff (real upcoming match).
- [ ] **P8-DATA-8** — Production crons + `API_FOOTBALL_INGEST_ONLY=false` on Production (Vercel + GitHub schedule per ING-3).
- [x] **P8-DATA-9** — Historical depth: paginated league-season backfill, team gap-fill, future sync cron (`docs/FIXTURE-HISTORY-AUDIT.md`).
- [ ] **P8-DATA-10** — Live: two-tab manual DoD from [LIVE_POLLING.md](./LIVE_POLLING.md).

**Definition of Done (16.1):**

- [ ] Incognito: pinned FT URLs show **non-empty** Timeline + Live stats + Lineups tab (when provider had data).
- [ ] Pinned NS URL shows **correct** empty/partial states + Form/H2H when history exists.
- [ ] No match section shows generic empty without **actionable copy** (sync/kickoff-relative lineup message).

### 16.2 — Flagship Match Details (PRD §6.4)

**Owner:** Agent. **Depends on 16.1 for verification.**

- [ ] **P8-MATCH-1** — Information hierarchy audit vs PRD §6.4 (Header → AI Hero → Stats → Momentum → Form/H2H → Timeline → Lineups → Follow).
- [ ] **P8-MATCH-2** — AI Hero ~25–30% desktop; JetBrains Mono probabilities; confidence + data quality + "AI updated Xs ago".
- [ ] **P8-MATCH-3** — Guest: AI locked only; stats/timeline/lineups visible.
- [ ] **P8-MATCH-4** — Timeline: icons, order, live append; provider-aware empty states.
- [ ] **P8-MATCH-5** — Lineups: confirmed/predicted, pitch SVG, player profile links.
- [ ] **P8-MATCH-6** — Form/H2H: last 10 default, same-competition toggle; visible without hunting tabs.
- [ ] **P8-MATCH-7** — Favorite match + Follow team/player on match page (Phase 6 wiring).
- [ ] **P8-MATCH-8** — Pre-match AI: 24h + 60 min regen documented/enforced (`warm-ai-prematch` + lineups).
- [ ] **P8-MATCH-9** — Manual walkthrough on **daily fixture**, not only pinned IDs.

### 16.3 — Design system & PRD §14 (premium SaaS look)

**Owner:** Agent. **After 16.1 smoke passes.**

- [ ] **P8-UI-1** — Token audit vs PRD §14.2 (`globals.css`, cards).
- [ ] **P8-UI-2** — Typography: Inter / JetBrains Mono / Space Grotesk (§14.3).
- [ ] **P8-UI-3** — MatchRow ↔ Match ↔ Dashboard parity (§14.4).
- [ ] **P8-UI-4** — AI cards + global disclaimer (§5, §14.1).
- [ ] **P8-UI-5** — Motion + `prefers-reduced-motion` (§14.7).
- [ ] **P8-UI-6** — Mobile §14.6 on match, team, player.
- [ ] **P8-UI-7** — Lighthouse match ≥80 mobile on Vercel preview (§15.1). _(Same gate as Phase 7 `quality:lighthouse`.)_
- [ ] **P8-UI-8** — `axe` — no critical a11y on match, dashboard, landing. _( `npm.cmd run quality:axe`.)_

### 16.4 — Core surfaces (PRD §6.2–6.3, §6.5–6.7)

**Owner:** Agent.

- [ ] **P8-SURF-1** — Dashboard §6.2 (featured, follows, Predictions Center link).
- [ ] **P8-SURF-2** — Live Center §6.3 (filters, URL state, pagination, AI updated marker).
- [ ] **P8-SURF-3** — Fixtures §6.3.1 verified on prod-like data.
- [ ] **P8-SURF-4** — Team profile §6.5 tabs.
- [ ] **P8-SURF-5** — Player profile §6.6.
- [ ] **P8-SURF-6** — League page §6.7.
- [ ] **P8-SURF-7** — Predictions Center §6.8 (Top 10 picks).

### 16.5 — SaaS accounts, billing, entitlements (PRD §5, Phase 6)

**Owner:** Agent + founder (LemonSqueezy).

- [ ] **P8-BILL-1** — `/pricing` €2.99/mo + trial copy.
- [ ] **P8-BILL-2** — Checkout + LemonSqueezy webhook + entitlements.
- [ ] **P8-BILL-3** — Free AI cap + premium unlimited (server-enforced).
- [ ] **P8-BILL-4** — Profile + preferences (timezone, league, notification/sound).
- [ ] **P8-BILL-5** — Notification bell + MVP triggers (§13.1).
- [x] **P8-BILL-6** — Sound (synthetic audio) + toggles; default off (§13.2).
- [ ] **P8-BILL-7** — E2E: signup → trial → webhook → unlimited AI on match.

### 16.6 — Launch gate

**Owner:** Founder + Agent (reuses Phase 7 where open).

- [ ] **P8-LAUNCH-1** — Landing with real Phase 8 screenshots (§6.1).
- [ ] **P8-LAUNCH-2** — Legal, cookie, PostHog funnels (Phase 7).
- [ ] **P8-LAUNCH-3** — Soft launch 10–20 users; 48h critical fixes.
- [ ] **P8-LAUNCH-4** — Public launch checklist (Phase 7).

### Phase 8 — Overall Definition of Done

Phase 8 is **not** complete until **all** are true:

1. **16.1** passed on preview/production, not only local bootstrap.
2. Match page matches **PRD §6.4** hierarchy and **§14** on desktop + mobile.
3. **P8-BILL-7** trial E2E works.
4. **Predictions Center** live.
5. Founder **15 min demo recording**: Dashboard → Live → FT match (full cards) → NS match (honest states) → AI → pricing — **without** "run a script first."

### Suggested work order (one task per session)

1. P8-DATA-4 → P8-DATA-5 → P8-DATA-7 → P8-DATA-8
2. P8-MATCH-1 … P8-MATCH-6
3. P8-UI-1 → P8-UI-3 → P8-UI-7
4. P8-SURF-7 + P8-BILL-*
5. P8-LAUNCH-*
