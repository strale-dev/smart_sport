# RCA Phase 4 — Production verification report

**Verified at:** 2026-09-26T13:34:53.560Z
**Production URL:** https://scorence.app

## Coverage (Postgres)

| Metric                         | Value |
| ------------------------------ | ----: |
| Upcoming fixtures (7d, NS/TBD) |   201 |
| aiEligible upcoming            |     0 |
| Upcoming with PREMATCH insight |     1 |
| Stuck sync runs (>2h running)  |     0 |

## Cron route probes (no auth)

| Route                            | HTTP |
| -------------------------------- | ---: |
| `/api/cron/warm-ai-prematch`     |  401 |
| `/api/cron/sync-fixtures-today`  |  401 |
| `/api/cron/sync-fixtures-future` |  401 |
| `/api/cron/sync-live-center`     |  401 |

## Fixture walk (samples from DB)

| Bucket  | Provider ID | Status | aiEligible | Insight | Prediction |
| ------- | ----------: | ------ | ---------- | ------- | ---------- |
| working |     1606668 | FT     | false      | true    | true       |
| working |     1555720 | FT     | false      | true    | true       |
| broken  |     1564327 | NS     | false      | false   | false      |
| broken  |     1638170 | NS     | false      | false   | false      |

## Result

**PASS** (no blocking failures)

### Warnings

- No upcoming fixtures marked aiEligible — run sync-fixtures-today / readiness refresh on production
