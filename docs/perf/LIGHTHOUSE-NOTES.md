# Lighthouse snapshots (scorence.app)

## Baseline (repo `.lighthouse-match-prod-mobile-v3.json`, pre-change)

| Metric            | Value    |
| ----------------- | -------- |
| Performance score | 0.64     |
| LCP               | 5.4s     |
| TTI               | 6.4–7.8s |
| TBT               | ~640ms   |
| Server TTFB (LH)  | ~250ms   |

## Post-change probe (2026-11-02, same URL, mobile)

File: [lighthouse-match-prod-post-change-mobile.json](./lighthouse-match-prod-post-change-mobile.json)

| Metric            | Value |
| ----------------- | ----- |
| Performance score | 0.69  |
| LCP               | 4.8s  |
| TTI               | 6.4s  |
| TBT               | 520ms |

Note: This run was against **current production** before this PR deploys code fixes. Re-run after deploy:

```bash
QUALITY_BASE_URL=https://scorence.app node scripts/quality-lighthouse-check.mjs
```
