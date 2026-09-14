# Billing E2E checklist (LemonSqueezy)

Use **production** `https://scorence.app/api/webhooks/lemonsqueezy` with the live store.

## Vercel Production env

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_VARIANT_ID_PREMIUM_299` — **variant** ID (not the product ID). In the dashboard: Products → Scorence Premium → Variants → copy the variant ID.
- `LEMONSQUEEZY_WEBHOOK_SECRET`

## LemonSqueezy dashboard

1. Webhook URL → `https://scorence.app/api/webhooks/lemonsqueezy`
2. Events: subscription created/updated/payment success/failed/cancelled/expired
3. Variant: €2.99/mo, 7-day trial, card required

## Manual E2E

1. Sign up / sign in on production.
2. Open `/pricing` → **Start 7-day free trial** → complete checkout.
3. In Supabase: `entitlements.tier = PREMIUM` for your user; `subscriptions` row present.
4. Generate prematch AI on a match → no `AI_LIMIT_REACHED`.
5. Cancel in customer portal → webhook → tier `FREE` after period ends (or immediately on `subscription_expired`).
6. Confirm follows/favorites rows unchanged.

## Local verification

- `npm.cmd run test -- --run lib/billing lib/ai/usage-gate.test.ts`
- Webhook signature tests do not hit the network.
