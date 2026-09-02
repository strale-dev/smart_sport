# Scorence — Implementation Roadmap

> Companion to [PRD.md](./PRD.md), [Tech.md](./Tech.md), and [DB.md](./DB.md).
> **Timeline:** 8 weeks to MVP launch.
> **Team:** Solo developer (with AI pair-programming).
> **Version:** 1.0
> **Last updated:** 2026-08-26

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

Koraci (samo env + schedule + uključivanje već predviđenih sync funkcija — **bez** promene ingestion arhitekture):

1. Kupiti API-Football Pro ($19/mo) i zameniti `API_FOOTBALL_KEY` u `.env.local` + Vercel env.
2. Postaviti `API_FOOTBALL_DAILY_LIMIT=7500`.
3. Production: `API_FOOTBALL_INGEST_ONLY=false` (development može ostati `true`).
4. Ažurirati [vercel.json](../vercel.json): standings `0 */6 * * *`, dodati lineups `*/15 * * * *`.
5. Implementirati `sync-lineups` body (ruta već postoji) — upcoming fixtures ≤ 90 min.
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
- [ ] Google OAuth configured in Supabase (`redirect: /api/auth/callback`). _(App callback + Google button are wired. Add Google Client ID/Secret and redirect URLs in the Auth dashboard.)_
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
- [ ] **Verify against staging/prod-like data** (not local ±1 day dev sync): multi-day grouping, scroll anchor, empty states, mobile tab scroll.

**Favorites feed v1 (read-only)**

- [x] `/favorites` — followed-team fixtures for -30/+365 days, grouped by day and league (user timezone).
- [x] `favoritesService` + DB reads from `follows` → `fixtures`.
- [x] Scroll anchor on today (or live match / nearest day with fixtures).
- [x] Empty states for no follows and no matches in window.
- [x] Unit tests for timezone grouping and anchor logic.
- [ ] Follow/Unfollow UI (Phase 6) — until then, follows are seeded manually for QA.

**Match page skeleton**

- [ ] `/matches/[fixtureId]` — server component with real match header, no AI yet.
- [ ] Placeholder cards for future sections (labeled "coming soon" — never fake data).

**Team & player profile skeletons**

- [ ] `/teams/[teamId]` — header + tabs (Details, Matches).
- [ ] `/players/[playerId]` — header + Overview tab.

**Guest paywall**

- [ ] `AIHeroLockedCard` — blurred preview with "Sign up free to unlock AI" CTA (component reused later).

### Definition of Done

- [ ] Anon user can view a real match page and see verified data.
- [ ] Signed-in user sees the same page + user menu.
- [ ] Real fixture list on Dashboard, populated from Postgres (no dummy data).
- [ ] All navigation works on mobile (375px) without horizontal scroll.
- [ ] PostHog sees `signup_completed`, `login_completed`, `match_viewed`.

### Risks / watch-outs

- Session cookies + SSR — verify against Next 16 App Router quirks (read the local Next docs).
- Google OAuth redirect URI must be pre-registered in Google Cloud Console.

---

## 6. Phase 3 — Match page & analytics (Week 4)

### Goal

Match Details is fully populated: stats, timeline, lineups, form, H2H. AnalyticsService computes form and H2H from Postgres. Teams and player profiles gain their statistics tabs.

### Deliverables

**Match Details cards**

- [ ] `MatchHeader` — teams, score, minute/status, venue, competition.
- [ ] `LiveStatsCard` — shots, possession, xG, cards.
- [ ] `TimelineCard` — event stream with icons per event type.
- [ ] `LineupsCard` — pitch view (SVG) with grid positions; substitutes below; unavailable → "Predicted lineup" or "Lineups not confirmed yet".
- [ ] `FormCard` — last 5/10 W/D/L with drill-down.
- [ ] `H2HCard` — toggle for "All comps" vs "Same league".
- [ ] `TeamComparisonCard` — bar chart via `recharts` comparing key stats.
- [ ] `PlayersToWatchCard` — placeholder for player impact (real logic in Phase 4).

**Analytics service**

- [ ] `analyticsService.getRecentForm(teamId, {matches, scope})`.
- [ ] `analyticsService.getH2H(teamAId, teamBId, {windowSize, scope, leagueId})`.
- [ ] `form_snapshots` and `h2h_summaries` populated by:
  - On-demand computation with cache fallthrough.
  - Nightly cron refresh (`app/api/cron/refresh-analytics/route.ts`).

**Team profile**

- [ ] Details tab (venue, country, current form).
- [ ] Matches tab (upcoming + past).
- [ ] Standings tab.
- [ ] Squad tab.
- [ ] Statistics tab.

**Player profile**

- [ ] Overview: header, attribute overview (position-aware summary; basic sliders/bars via `recharts`).
- [ ] Matches tab with goals/assists/cards badges.
- [ ] Statistics tab (season).

**League page**

- [ ] Overview + Standings + Fixtures + Top scorers/assists.

### Definition of Done

- [ ] A random real fixture page on desktop shows every card populated with real data or a clean partial state.
- [ ] Mobile match page is scrollable, cards stack, no layout break.
- [ ] Lighthouse mobile performance ≥ 80.
- [ ] All new services have unit tests for core logic.

### Risks / watch-outs

- xG data is not universal — cards must gracefully hide if provider omits.
- Predicted lineups often missing for lower leagues — show "not yet published" state.

---

## 7. Phase 4 — Prediction & AI engine (Week 5)

### Goal

Pre-match probabilities are computed by the deterministic engine. The LLM wraps them in a structured, cached, validated AI insight. AI Intelligence Hero is live on the match page for signed-in users.

### Deliverables

**Prediction engine**

- [ ] `lib/models/elo.ts` — Elo update (historical fixture backfill script for MVP leagues).
- [ ] `lib/models/features.ts` — feature vector builder (pre-match).
- [ ] `lib/models/logistic.ts` — logistic regression with initial coefficients (from public research + cold-start heuristics).
- [ ] `lib/models/poisson.ts` — Bivariate Poisson for goal expectation.
- [ ] `lib/services/predictionService.ts` — orchestrates model call, stores `predictions` row (with `model_version_id`, `input_snapshot`).
- [ ] `model_versions` seed with `1.0.0`.
- [ ] Confidence bucketing per PRD §8.2.

**AI service**

- [ ] `lib/ai/schemas.ts` — Zod `AIInsightSchema` (from Tech.md §14.1).
- [ ] `lib/ai/prompts.ts` — system + user prompt templates. Version tag stored.
- [ ] `lib/ai/cache.ts` — `context_hash` computation + lookup.
- [ ] `lib/services/aiContextService.ts` — trims features into LLM-safe context.
- [ ] `lib/services/aiService.ts`:
  - `generatePrematchInsight(fixtureId, {userId?, tier})`.
  - Structured Outputs call to OpenAI (`gpt-4o-mini` default; `gpt-4o` for deep tier).
  - Zod re-validation post-response.
  - Persist to `ai_insights` with cost + token counts.
  - Return cached result on subsequent hits.
- [ ] `app/api/ai/prematch/[fixtureId]/route.ts` — server route (rate-limited, tier-checked).

**Guardrails**

- [ ] System prompt states injection resistance.
- [ ] Structured input only; raw provider text is filtered before being fed.
- [ ] Per-user rate limiter (Upstash Ratelimit).
- [ ] `AI_LIMIT_REACHED` typed response contract.

**UI**

- [ ] `components/ai/AIHeroCard.tsx` — full-width hero at top of match page.
- [ ] `components/ai/ConfidenceBadge.tsx`, `DataQualityChip.tsx`.
- [ ] `components/ai/KeyFactorsList.tsx`.
- [ ] Skeleton + `AI_LIMIT_REACHED` empty state + fallback (probabilities-only) view.
- [ ] Guest sees `AIHeroLockedCard` blurred CTA.

**Public methodology page**

- [ ] `/methodology` — writes up the model in plain English (per PRD §8.4).

### Definition of Done

- [ ] Opening any upcoming real fixture surfaces an AI insight that:
  - Uses real features (verifiable in `input_snapshot`).
  - Passes Zod validation.
  - Is cached — second view triggers 0 new OpenAI calls.
- [ ] Manual sanity check: at least 10 upcoming matches inspected — probabilities look sensible (favorite has ≥ 40% typically; no zero probabilities).
- [ ] Free user hitting 6th AI call in a day sees `AI_LIMIT_REACHED` gracefully.

### Risks / watch-outs

- Cold-start model quality — accept that Elo + logistic gives "OK not great" probabilities; the AI's job is to explain honestly, including confidence.
- OpenAI Structured Outputs occasionally returns malformed values under load — retry once, else fallback.

---

## 8. Phase 5 — Live engine (Week 6)

### Goal

Live matches update automatically. When a user opens a live fixture, a shared polling loop kicks off; a Realtime broadcast informs all viewers; AI insight refreshes only on meaningful events.

### Deliverables

**Coordinator + polling**

- [ ] `lib/live/coordinator.ts` — presence-aware start/stop.
- [ ] `lib/live/poller.ts` — the 30–40s poll loop per active fixture.
- [ ] Redis distributed lock ensures **one worker per fixture** globally.
- [ ] Grace period (60s) before stopping when presence drops to zero.
- [ ] Fallback cron `app/api/cron/reap-stale-locks/route.ts` — recovers from crashed workers.

**Realtime broadcast**

- [ ] `lib/live/broadcaster.ts` — writes to `match:{id}` channel.
- [ ] Client subscription hook `useLiveMatch(fixtureId)` on match page.
- [ ] React Query fallback polling (60s while tab visible) if broadcast missed.
- [ ] Presence tracking on the same channel.

**Meaningful event detection**

- [ ] `lib/live/eventDetector.ts` — detects: goal, red card, penalty, xG delta > 0.5, probability swing > 10pp, significant sub.
- [ ] When triggered:
  - New `predictions` row (LIVE, with minute).
  - `predictionService.updateLiveProbability` via `lib/models/liveProbability.ts`.
  - `aiService.generateLiveInsight` regenerates (cache key includes state hash).

**UI**

- [ ] Live status chip pulses on match header.
- [ ] Score-flip animation via Framer Motion on goal.
- [ ] Timeline appends new events with soft animation.
- [ ] AI Hero shows "AI updated Xs ago" and refreshes commentary in place (no full page reflow).
- [ ] Live probability chart placeholder (full chart in post-MVP).

**Live Center enhancements**

- [ ] "AI updated" marker on rows with fresh insights.
- [ ] Sort factor: recently updated matches float slightly higher.

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

- [ ] `/pricing` page — €2.99/mo with 7-day trial + grandfathering explanation.
- [ ] Server action `createCheckoutSession` → LemonSqueezy signed URL.
- [ ] `app/api/webhooks/lemonsqueezy/route.ts` — signature verify, upsert `subscriptions`, sync `entitlements`.
- [ ] Handles events: `subscription_created`, `subscription_updated`, `subscription_payment_success`, `subscription_payment_failed`, `subscription_cancelled`, `subscription_expired`.
- [ ] `subscription/page.tsx` in profile — manage subscription, portal link.

**Entitlements & rate limits**

- [ ] `lib/entitlements/limits.ts` — all limits loaded from env.
- [ ] `entitlementService.canGenerateAI(userId, kind)` checks tier + usage.
- [ ] `ai_usage` increments atomically (Redis + Postgres reconciliation).
- [ ] Every AI/live endpoint enforces entitlements server-side.
- [ ] Nightly cron `cleanup-ai-usage` resets daily counters to yesterday's date (rollover safety).

**Follows & favorites (fully wired)**

- [ ] Follow/Unfollow buttons on team, player, league pages.
- [ ] Favorite button on match page (bookmark to `public.favorites`; separate from `/favorites` team feed).
- [ ] Dashboard "Your teams/players" section becomes real.
- [ ] Wire follow actions into the existing `/favorites` feed (no page rebuild needed).

**Notifications**

- [ ] `notificationService.enqueue({userId, kind, ...})`.
- [ ] Realtime broadcast to `user:{id}:notifications`.
- [ ] `components/notifications/NotificationBell.tsx` in top nav.
- [ ] `notifications/list-drawer.tsx` with read-state toggles.
- [ ] Notification triggers wired:
  - Goal for followed team.
  - Full-time for followed team.
  - Lineup confirmed for followed team.
  - Prediction shift on watched match.
  - AI insight refreshed for active viewed match.

**Sound**

- [ ] Sound assets in `/public/sounds/` — `goal.mp3` (synthetic cheer), `whistle.mp3`.
- [ ] `useSoundPreference()` hook.
- [ ] `SoundToggle` component on match page + preferences.
- [ ] Default off; requires a prior user gesture in the tab to be allowed.

**Emails**

- [ ] React Email templates for `WelcomeEmail`, `PasswordResetEmail`, `PaymentSuccessEmail`, `TrialEndingEmail`, `SubscriptionCancelledEmail`.
- [ ] `TrialEndingEmail` triggered by daily cron 3 days before `trial_ends_at`.

**Profile & preferences**

- [ ] `/profile` — display name, avatar upload (Supabase Storage).
- [ ] `/profile/preferences` — timezone, preferred league, notification + sound toggles.
- [ ] Account deletion server action.

### Definition of Done

- [ ] End-to-end: sign up → start trial → hit webhook → get PREMIUM tier → generate unlimited AI insights.
- [ ] Cancel trial → tier reverts to FREE at period end; follows/favorites intact.
- [ ] Free user hitting daily AI cap sees `AI_LIMIT_REACHED` and upgrade CTA.
- [ ] Notification for a goal fires within 10s of provider confirmation for the followed team.
- [ ] Sentry breadcrumbs show entitlement decisions on gated endpoints.

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

- [ ] Funnel: `landing_view` → `signup_completed` → `trial_started` → `trial_converted`.
- [ ] Retention chart D1/D7/D30.
- [ ] DAU trend widget.
- [ ] AI usage per user per day.
- [ ] Match views heatmap by league.

**Quality**

- [ ] Manual QA sweep on desktop (Chrome + Safari + Firefox) and mobile (iOS Safari + Android Chrome).
- [ ] Lighthouse: performance ≥ 80 mobile, ≥ 90 desktop; accessibility ≥ 95.
- [ ] `axe` accessibility audit — no critical violations.
- [ ] Every PRD principle sanity-checked (no fake data, all states covered).
- [ ] Load test key endpoints with `k6` script — 50 concurrent users on `/matches/[id]` and `/dashboard`.

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
- **PostHog event catalog.** A living `docs/EVENTS.md` (Phase 2 onwards) mapping every tracked event → funnel it supports.
- **Cost dashboard.** A Notion or Sheet with daily spend on Supabase, API-Football, OpenAI, LemonSqueezy, Vercel, Upstash, Resend, PostHog, Sentry.
- **Founder log.** Public build-in-public log (weekly, optional) — helps with marketing and self-accountability.
- **Cursor rules.** Update `AGENTS.md` and `.cursor/rules/`* any time a new pattern emerges (services, cache keys, RLS conventions).
