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

| Event                  | Trigger                                                 | Properties                                 | Source                                                                 | Funnel         |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- | -------------- |
| `ai_insight_generated` | Server generates a fresh pre-match insight (cache miss) | `fixture_id`, `cached`, `model`, `app_env` | `app/api/ai/prematch/[fixtureId]/route.ts` via `lib/posthog/server.ts` | AI consumption |
| `ai_generate_clicked`  | User clicks Generate analysis on match page             | `fixture_id`                               | `components/ai/AIInsightProvider.tsx`                                  | AI consumption |
| `ai_limit_reached`     | Client receives `AI_LIMIT_REACHED` from POST            | `fixture_id`, `limit`, `used`              | `components/ai/AIInsightProvider.tsx`                                  | Upgrade funnel |

## Phase 5 — Live engine UI

| Event                                    | Trigger                                           | Properties                 | Source                                          | Funnel              |
| ---------------------------------------- | ------------------------------------------------- | -------------------------- | ----------------------------------------------- | ------------------- |
| `ai_live_insight_viewed`                 | Live AI hero shows a cached or fresh LIVE insight | `fixture_id`, `insight_id` | `components/ai/AIInsightProvider.tsx` (planned) | Live AI consumption |
| `match_score_flipped`                    | Live score string changes on match header/row     | `fixture_id`               | `components/match/AnimatedScore.tsx` (planned)  | Live engagement     |
| `live_meaningful_event_received`         | Client receives broadcast with `meaningfulEvents` | `fixture_id`, `kind`       | `hooks/useLiveMatch.ts` (planned)               | Live loop health    |
| `live_center_ai_updated_marker_rendered` | Live Center row renders fresh AI updated chip     | `fixture_id`               | `components/match/MatchRow.tsx` (planned)       | Live Center depth   |

Event names are registered in `lib/posthog/events.ts`; wire capture when manual PostHog QA begins.

### Notes

- **Identify:** `signup_completed` and `login_completed` call `posthog.identify(userId)` before capture.
- **Auth callback:** OAuth and email-confirmation flows redirect with `?auth_event=signup|login`; `AuthAnalytics` captures after consent is ready, then strips the query param.
- **Guest funnel:** `match_viewed.is_guest = true` for anonymous viewers on guest-OK routes.

---

## Phase 0–1 (reference)

| Event                    | Trigger                          | Source                  |
| ------------------------ | -------------------------------- | ----------------------- |
| `landing_view`           | Marketing landing page view      | Client page mount       |
| `waitlist_cta_click`     | Waitlist CTA clicked             | Marketing components    |
| `cookie_consent_updated` | User updates cookie preferences  | Cookie consent banner   |
| `waitlist_signup`        | Waitlist form submitted (server) | `lib/posthog/server.ts` |

---

## Planned (later phases)

From [Tech.md §21.1](./Tech.md#211-posthog) — not yet implemented:

- `trial_started`, `trial_converted`, `subscription_cancelled`
- `live_match_viewed`
- `follow_added`, `favorite_added`
- `paywall_shown`
