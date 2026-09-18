# Billing E2E checklist (LemonSqueezy)

Use **production** `https://scorence.app/api/webhooks/lemonsqueezy` with the live store.

## Dev / CI (no card)

Automated Phase 6 gates — no LemonSqueezy network calls:

```bash
npm.cmd run phase6:webhook-smoke      # lib/billing/sync-subscription.test.ts
npm.cmd run phase6:entitlements-smoke # lib/entitlements/entitlementService.test.ts
npm.cmd run phase6:check              # full Phase 6 DoD pipeline
```

Optional follow integration (mutates one `follows` row, then deletes it):

```bash
set PHASE6_QA_USER_ID=<your-supabase-user-uuid>
npm.cmd run phase6:follow-smoke
```

Unit tests (also run inside `phase6:check`):

```bash
npm.cmd run test:ci -- lib/billing lib/entitlements lib/ai/usage-gate.test.ts
```

## Vercel Production env

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_VARIANT_ID_PREMIUM_299` — **variant** ID (not the product ID). In the dashboard: Products → Scorence Premium → Variants → copy the variant ID.
- `LEMONSQUEEZY_WEBHOOK_SECRET`

## LemonSqueezy dashboard

1. Webhook URL → `https://scorence.app/api/webhooks/lemonsqueezy`
2. Events: subscription created/updated/payment success/failed/cancelled/expired
3. Variant: €2.99/mo, 7-day trial, card required

## Founder gate (required before Phase 6 “done”)

Complete after `npm.cmd run phase6:check` is green locally/CI.

### Billing E2E

1. Sign up / sign in on production (or preview with webhook URL pointed at that deploy).
2. Open `/pricing` → **Start 7-day free trial** → complete checkout.
3. In Supabase: `entitlements.tier = PREMIUM` for your user; `subscriptions` row present.
4. Generate prematch AI on a match → no `AI_LIMIT_REACHED`.
5. Cancel in customer portal → webhook → tier `FREE` after period ends (or immediately on `subscription_expired`).
6. Confirm `follows` / `favorites` rows unchanged.

### Product / observability

7. **Free cap UI:** FREE user at daily cap → `AI_LIMIT_REACHED` + upgrade CTA on match page.
8. **Notifications:** follow a team playing live → goal notification within ~10s of provider confirmation.
9. **Sentry:** trigger AI limit → issue shows breadcrumb `category: entitlements`.
10. **PostHog Live Events** (analytics consent on): `trial_started`, `follow_added`, `trial_converted` or `subscription_cancelled`, `ai_limit_reached`.

Check off items in [ROADMAP.md §9 manual DoD](./ROADMAP.md#9-phase-6--accounts-premium-entitlements-week-7) when verified.
