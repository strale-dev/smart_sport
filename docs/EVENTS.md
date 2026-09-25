# Scorence — PostHog Event Catalog

> Living catalog of tracked events. Phase 2 onwards — map every event to the funnel it supports.
> See also [Tech.md §21.1](./Tech.md#211-posthog) and [ROADMAP.md §12](./ROADMAP.md#12-definition-of-done--general-rules).

**Consent:** All client events require analytics cookie consent (`hasAnalyticsConsent`). PostHog is initialized with `opt_out_capturing_by_default: true`.

---

## Phase 2 — Core UX shell

| Event              | Trigger                                                                          | Properties                                      | Source                                                                                          | Funnel                          |
| ------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------- |
| `signup_completed` | User completes signup (email immediate session, or OAuth/email-confirm callback) | _(none beyond identify)_                        | `components/auth/SignupForm.tsx`, `components/auth/AuthAnalytics.tsx` via `lib/posthog/auth.ts` | Landing → signup → activation   |
| `login_completed`  | User completes login (password or OAuth callback)                                | _(none beyond identify)_                        | `components/auth/LoginForm.tsx`, `components/auth/AuthAnalytics.tsx` via `lib/posthog/auth.ts`  | Return visit → engagement       |
| `match_viewed`     | Match detail page loads (once per visit)                                         | `fixture_id`, `league_id`, `status`, `is_guest` | `components/match/MatchViewAnalytics.tsx`                                                       | Content discovery → match depth |

## Phase 3 — Match Details cards

| Event                      | Trigger                                          | Properties                               | Source                                      | Funnel                  |
| -------------------------- | ------------------------------------------------ | ---------------------------------------- | ------------------------------------------- | ----------------------- |
| `match_tab_changed`        | User switches match page tab                     | `tab`, `fixture_id`                      | `components/match/MatchDetailsTabs.tsx`     | Match depth exploration |
| `match_form_scope_changed` | User toggles form window (5/10) on Standings tab | `scope`, `matches`, `fixture_id`         | `components/match/FormCard.tsx`             | Analytics engagement    |
| `match_h2h_scope_changed`  | User toggles H2H scope (All comps / Same league) | `scope`, `fixture_id`                    | `components/match/H2HCard.tsx`              | Analytics engagement    |
| `match_momentum_viewed`    | Momentum card renders on live/finished Overview  | `fixture_id`, `status`, `bucket_count`   | `components/match/MatchMomentumCard.tsx`    | Live match engagement   |
| `league_viewed`            | League detail page loads (once per visit)        | `league_id`, `season`, `tab`, `is_guest` | `components/league/LeagueViewAnalytics.tsx` | Competition discovery   |

## Phase 4 — AI service (backend + UI)

| Event                           | Trigger                                                 | Properties                                  | Source                                                                  | Funnel         |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- | -------------- |
| `ai_insight_generated`          | Server generates a fresh pre-match insight (cache miss) | `fixture_id`, `cached`, `model`, `app_env`  | `app/api/ai/prematch/[fixtureId]/route.ts` via `lib/posthog/server.ts`  | AI consumption |
| `internal_model_metrics_viewed` | Founder opens internal accuracy dashboard               | `period_days`, `evaluated_count`, `app_env` | `app/(app)/internal/model-metrics/page.tsx` via `lib/posthog/server.ts` | Internal ops   |
| `ai_generate_clicked`           | User clicks Generate analysis on match page             | `fixture_id`                                | `components/ai/AIInsightProvider.tsx`                                   | AI consumption |
| `ai_limit_reached`              | Client receives `AI_LIMIT_REACHED` from POST            | `fixture_id`, `limit`, `used`               | `components/ai/AIInsightProvider.tsx`                                   | Upgrade funnel |

## Phase 5 — Live engine UI

| Event                                    | Trigger                                           | Properties                 | Source                                          | Funnel              |
| ---------------------------------------- | ------------------------------------------------- | -------------------------- | ----------------------------------------------- | ------------------- |
| `ai_live_insight_viewed`                 | Live AI hero shows a cached or fresh LIVE insight | `fixture_id`, `insight_id` | `components/ai/AIInsightProvider.tsx` (planned) | Live AI consumption |
| `match_score_flipped`                    | Live score string changes on match header/row     | `fixture_id`               | `components/match/AnimatedScore.tsx` (planned)  | Live engagement     |
| `live_meaningful_event_received`         | Client receives broadcast with `meaningfulEvents` | `fixture_id`, `kind`       | `hooks/useLiveMatch.ts` (planned)               | Live loop health    |
| `live_center_ai_updated_marker_rendered` | Live Center row renders fresh AI updated chip     | `fixture_id`               | `components/match/MatchRow.tsx` (planned)       | Live Center depth   |

Event names are registered in `lib/posthog/events.ts`; wire capture when manual PostHog QA begins.

## Phase 6 — Accounts, billing, follows

| Event                       | Trigger                                         | Properties                            | Source                                                               | Funnel             |
| --------------------------- | ----------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------- | ------------------ |
| `follow_added`              | User follows team/player/league                 | `object_type`, `provider_id`          | `components/follow/FollowToggle.tsx`                                 | Activation         |
| `follow_removed`            | User unfollows                                  | `object_type`, `provider_id`          | `components/follow/FollowToggle.tsx`                                 | Engagement         |
| `favorite_added`            | User bookmarks a match                          | `fixture_id`                          | `components/follow/FavoriteMatchToggle.tsx`                          | Engagement         |
| `favorite_removed`          | User removes match bookmark                     | `fixture_id`                          | `components/follow/FavoriteMatchToggle.tsx`                          | Engagement         |
| `trial_started`             | User submits pricing checkout (before redirect) | `source`                              | `components/billing/StartTrialButton.tsx`                            | Trial funnel       |
| `trial_converted`           | First payment after trial (webhook)             | `provider_subscription_id`, `app_env` | `app/api/webhooks/lemonsqueezy/route.ts` via `lib/posthog/server.ts` | Trial conversion   |
| `subscription_cancelled`    | Subscription cancelled or expired (webhook)     | `provider_subscription_id`, `app_env` | `app/api/webhooks/lemonsqueezy/route.ts` via `lib/posthog/server.ts` | Churn              |
| `predictions_center_viewed` | Predictions Center page loads (once per visit)  | `is_guest`, `pick_count`              | `components/predictions/PredictionsViewAnalytics.tsx`                | Predictions funnel |

### Notes

- **Identify:** `signup_completed` and `login_completed` call `posthog.identify(userId)` before capture.
- **Auth callback:** OAuth and email-confirmation flows redirect with `?auth_event=signup|login`; `AuthAnalytics` captures after consent is ready, then strips the query param.
- **Guest funnel:** `match_viewed.is_guest = true` for anonymous viewers on guest-OK routes.

---

## Dashboards (Phase 7)

Launch board, metric definitions, and QA checklist: **[ANALYTICS-DASHBOARDS.md](./ANALYTICS-DASHBOARDS.md)**.

Product events used for DAU/retention: [`lib/posthog/product-events.ts`](../lib/posthog/product-events.ts).

---

## Phase 0–1 (reference)

| Event                    | Trigger                          | Source                  |
| ------------------------ | -------------------------------- | ----------------------- |
| `landing_view`           | Marketing landing page view      | Client page mount       |
| `waitlist_cta_click`     | Waitlist CTA clicked             | Marketing components    |
| `cookie_consent_updated` | User updates cookie preferences  | Cookie consent banner   |
| `waitlist_signup`        | Waitlist form submitted (server) | `lib/posthog/server.ts` |

---

## Near-term post-launch

| Event                             | Trigger                                 | Properties              | Source                                              |
| --------------------------------- | --------------------------------------- | ----------------------- | --------------------------------------------------- |
| `landing_experiment_viewed`       | Hero experiment variant resolved        | `experiment`, `variant` | `components/marketing/LandingHeroExperiment.tsx`    |
| `push_subscribed`                 | Push subscription saved                 | _(none)_                | Client + `app/api/push/subscribe/route.ts` (server) |
| `push_unsubscribed`               | Push subscription removed               | _(none)_                | Client + `app/api/push/unsubscribe/route.ts`        |
| `premium_analytics_locked_view`   | Premium lock overlay shown              | `feature`               | `components/entitlements/PremiumFeatureLock.tsx`    |
| `premium_analytics_upgrade_click` | User clicks Upgrade from analytics lock | `feature`               | `components/entitlements/PremiumFeatureLock.tsx`    |

PostHog feature flag: `landing-hero-v2` (control vs test). Create the experiment in PostHog before relying on variant traffic.

---

## Planned (later phases)

From [Tech.md §21.1](./Tech.md#211-posthog) — not yet implemented:

- `live_match_viewed`
- `paywall_shown`
