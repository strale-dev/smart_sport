# RCA Phase 4 — Production verification report

**Verified at:** 2026-09-26T13:59:19.250Z
**Production URL:** https://scorence.app

> **Note:** HTTP cron probes target **scorence.app**. Postgres coverage in this file comes from **`npm run rca:phase4:verify` using `.env.local`**, which points at Supabase **dev** (`zovobemlpqoclyjhvkpw`), not prod (`rqmwefmlbhvufdhnoief`). For ops SLO tracking see [PHASE-5-OPS.md](./PHASE-5-OPS.md).

## Coverage (Postgres)

| Metric                         | Value |
| ------------------------------ | ----: |
| Upcoming fixtures (7d, NS/TBD) |   201 |
| aiEligible upcoming            |    51 |
| Upcoming with PREMATCH insight |     9 |
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
| working |     1554174 | FT     | true       | true    | true       |
| working |     1555720 | FT     | false      | true    | true       |
| broken  |     1563767 | NS     | true       | false   | false      |
| broken  |     1641135 | NS     | true       | false   | true       |

## Result

**PASS** (no blocking failures)
