# Redis (Upstash) — production performance gate

Scorence relies on Upstash for **shared** server-side cache across Vercel serverless instances. Without it, every cold instance hits Supabase repeatedly (see dashboard range load and fixture reads).

## Verify after deploy

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  https://scorence.app/api/cron/health
```

Expected: HTTP **200**, `"ok": true`, `checks.redis.ok` and `checks.redis.cacheRoundTrip` both true.

## If health fails (503)

1. Open [Upstash Console](https://console.upstash.com/) — confirm the Redis database exists (prefer EU region near Vercel `fra1`).
2. Copy **REST URL** and **REST TOKEN** into Vercel → Project → Settings → Environment Variables → **Production**:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy Production (empty commit or “Redeploy” in Vercel).
4. Re-run the health curl above.

## Baseline curl (2026-11-02)

See [baseline-2026-11-02-curl.txt](./baseline-2026-11-02-curl.txt).
