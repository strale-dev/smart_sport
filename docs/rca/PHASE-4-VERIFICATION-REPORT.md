# RCA Phase 4 — Production verification report

**Verified at:** 2026-09-26T13:45:09.183Z
**Production URL:** https://scorence.app

## Coverage (Postgres)

| Metric                         | Value |
| ------------------------------ | ----: |
| Upcoming fixtures (7d, NS/TBD) |   201 |
| aiEligible upcoming            |    51 |
| Upcoming with PREMATCH insight |     7 |
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
| working |     1555720 | FT     | false      | true    | true       |
| working |     1606673 | FT     | false      | true    | true       |
| broken  |     1638170 | NS     | true       | false   | false      |
| broken  |     1641135 | NS     | true       | false   | false      |

## Result

**PASS** (no blocking failures)
