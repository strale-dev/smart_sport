# Scorence — PostHog launch dashboards (Phase 7)

Production project: **Default project** (PostHog id `259303`, EU).

## Primary dashboard

**[Scorence — Launch (Phase 7)](https://eu.posthog.com/project/259303/dashboard/961218)** — pinned, 5 tiles, last 90 days, UTC.

| Tile                  | Insight                                                                                               | ROADMAP item                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Acquisition funnel    | [Launch funnel: landing → trial converted](https://eu.posthog.com/project/259303/insights/FQALbpX8)   | `landing_view` → `signup_completed` → `trial_started` → `trial_converted` |
| Retention             | [Retention: first product activity (D1–D30)](https://eu.posthog.com/project/259303/insights/oDfuSyyS) | D1 / D7 / D30 (daily cohort table)                                        |
| DAU                   | [DAU: product activity](https://eu.posthog.com/project/259303/insights/xt4vBCby)                      | Daily active users                                                        |
| AI usage              | [AI usage: events & active users per day](https://eu.posthog.com/project/259303/insights/JS16HLVN)    | Event volume + unique AI users per day                                    |
| Match views by league | [Match views by league](https://eu.posthog.com/project/259303/insights/lS9yNypM)                      | `match_viewed` breakdown by `league_id`                                   |

## PostHog actions

| Action                                                                                   | ID       | Purpose                                |
| ---------------------------------------------------------------------------------------- | -------- | -------------------------------------- |
| [Product activity](https://eu.posthog.com/project/259303/data-management/actions/159127) | `159127` | DAU + retention (OR of product events) |
| [AI activity](https://eu.posthog.com/project/259303/data-management/actions/159128)      | `159128` | AI usage tile                          |

Product event allowlist is defined in code: [`lib/posthog/product-events.ts`](../lib/posthog/product-events.ts).

## Metric definitions

### Production filter (all tiles)

HogQL filter on every insight:

```text
properties.app_env = 'production'
OR ilike(toString(properties.$host), '%scorence.app%')
OR ilike(toString(properties.$current_url), '%scorence.app%')
```

After deploy with `posthog.register({ app_env })` in [`lib/posthog/client.ts`](../lib/posthog/client.ts), new client events include `app_env`. The host/URL clause keeps historical rows without `app_env`.

### DAU

Unique users per day who fired **any** event in the **Product activity** action. Excludes `$pageview` and meta events (`cookie_consent_updated`, `waitlist_signup`).

### Retention

- **Cohort (start):** first-ever **Product activity** (`retention_first_ever_occurrence`).
- **Return:** any subsequent **Product activity**.
- **Period:** Day; table shows intervals 0–30 (read D1, D7, D30 from columns 1, 7, 30).

### Acquisition funnel

- **Steps:** `landing_view` → `signup_completed` → `trial_started` → `trial_converted`.
- **Window:** 14 days, ordered (other events allowed between steps).
- **Note:** All steps require analytics consent. Users who land on `/signup` without `landing_view` drop at step 1 — expected.

### AI usage

Daily **total** AI events and **DAU** on the **AI activity** action (`ai_generate_clicked`, `ai_insight_generated`, `ai_limit_reached`, `ai_live_insight_viewed`). Average events per active user ≈ `AI events / AI active users` per day (manual or future formula series).

### Match views by league

Daily count of `match_viewed`, breakdown **event property** `league_id`, top 10 leagues.

## Founder QA checklist (~10 min)

1. Open [Live events](https://eu.posthog.com/project/259303/activity/live) with **analytics consent on**.
2. Visit `/` → confirm `landing_view`.
3. Sign up or log in → confirm `signup_completed` or `login_completed` + `$identify`.
4. Open a match → confirm `match_viewed` with `league_id`.
5. Click **Generate** on AI (if entitled) → confirm `ai_generate_clicked`; server may emit `ai_insight_generated`.
6. Start trial checkout → confirm `trial_started`.
7. After LemonSqueezy test webhook in staging/prod → confirm `trial_converted` with same user `distinct_id` as client.
8. Open the [launch dashboard](https://eu.posthog.com/project/259303/dashboard/961218) — tiles should populate as traffic grows (pre-launch counts may be small).

## Audit notes (2026-09-18)

- Funnel events are wired in app code; some steps (`signup_completed`, `trial_started`, `trial_converted`) had **zero** rows in the last 30d at audit time — dashboard is ready for launch traffic.
- Server billing/AI events use `distinctId: userId` — aligned with client `identify`.

See also: [EVENTS.md](./EVENTS.md), [ROADMAP.md § Phase 7](./ROADMAP.md).
