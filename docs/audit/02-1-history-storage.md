# Audit 02-1 — Historical data storage layer

**Date:** 2026-10-07  
**Prerequisites:** [01-1-ingestion-client.md](./01-1-ingestion-client.md), [01-2-fixture-ingestion.md](./01-2-fixture-ingestion.md), [01-3-jobs-quota-observability.md](./01-3-jobs-quota-observability.md), baseline [FIXTURE-HISTORY-AUDIT.md](../FIXTURE-HISTORY-AUDIT.md)

---

## 1. Audit summary (pre-change)

Historical match rows live in `fixtures` (unique `provider_id`). Ingestion paths: daily date window (`sync-fixtures`), future horizon (`sync-fixtures-future`), league-season bulk (`backfill-historical-fixtures`, `sync-league-season-fixtures`), and on-demand overview fill (`ensure-match-overview` with `last=8`).

Reads for analytics were split across [`queryTeamFixturesBefore`](../lib/analytics/point-in-time.ts) and [`queryFinishedTeamFixtures`](../lib/analytics/team-aggregates.ts) with different limits and incomplete score filtering. `ingestion_team_sync_state` existed but had no application writes.

### DB snapshot (Scorence dev, 2026-10-07)

| Team (provider_id)  | Finished (terminal) | Finished with scores |
| ------------------- | ------------------- | -------------------- |
| Arsenal (42)        | 224                 | 224                  |
| Newcastle (34)      | 105                 | 105                  |
| Crvena Zvezda (598) | 210                 | 210                  |

Top clubs already exceed 30+ **when league-season backfill has run**; many mid-table / cup-only teams in the near-term window lacked guaranteed team-scoped repair.

---

## 2. Root causes

1. **Storage depth tied to manual backfill** — Daily crons do not walk full team history; gap-fill targeted only 10 tier-1 clubs.
2. **Fragmented query layer** — No single contract for “completed matches before as-of”; `limit * 3` over-fetch; sample size could count unscored rows.
3. **No storage completeness model** — Predictions used `COMPLETE | PARTIAL` on form≥3, not per-team depth (30 vs 5).
4. **Quota waste on overview** — Provider `last=8` on thin DB even when a repair path could batch incrementally.
5. **Missing indexes for PIT scans** — Team + kickoff indexes were not partial on completed/scored rows.

---

## 3. New strategy

| Layer            | Approach                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Query**        | [`team-history-query.ts`](../lib/analytics/team-history-query.ts) — `kickoff_at < beforeAt`, terminal status, both scores set, scope HOME/AWAY/ALL, limits up to 100, optional league filter, multi-season window helper    |
| **Completeness** | `DATA_COMPLETE` (≥30), `DATA_PARTIAL` (10–29), `DATA_INSUFFICIENT` (&lt;10) per scope                                                                                                                                       |
| **Repair**       | [`repair-team-history.ts`](../lib/ingestion/repair-team-history.ts) — incremental `/fixtures?team=&season=`, skip when ≥30 scored completed, checkpoint job `repair-team-history`                                           |
| **State**        | [`ingestion-team-sync-state.ts`](../lib/ingestion/ingestion-team-sync-state.ts) writes `ingestion_team_sync_state` + cached `history_state`                                                                                 |
| **Integration**  | Cron route [`repair-team-history`](../app/api/cron/repair-team-history/route.ts); optional `TEAM_HISTORY_REPAIR_ON_SYNC=1` on `sync-fixtures`; backfill runs bounded repair batch; overview skips provider fill when DB ≥30 |

Deep **analytical selection** (which competitions enter models) remains a later task; query accepts `leagueProviderIds` / `buildMultiSeasonCompletedWindow` for fixture context.

---

## 4. Files changed

| File                                                               | Change                                                         |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| `lib/analytics/team-history-query.ts`                              | **New** — PIT query, counts, completeness, multi-season window |
| `lib/analytics/team-history-query.test.ts`                         | **New**                                                        |
| `lib/analytics/point-in-time.ts`                                   | Delegates team fixture query to shared module                  |
| `lib/analytics/team-aggregates.ts`                                 | Uses shared query; `last30All`; valid `finishedSampleSize`     |
| `lib/ingestion/ingestion-team-sync-state.ts`                       | **New**                                                        |
| `lib/ingestion/repair-team-history.ts`                             | **New** — repair + batch + discovery                           |
| `lib/ingestion/repair-team-history.test.ts`                        | **New**                                                        |
| `app/api/cron/repair-team-history/route.ts`                        | **New**                                                        |
| `lib/ingestion/backfill-historical-fixtures.ts`                    | Bounded repair batch after league-season pass                  |
| `lib/ingestion/sync-fixtures.ts`                                   | Optional repair hook + stats                                   |
| `lib/ingestion/ensure-match-overview.ts`                           | Scored count; skip provider when ≥30                           |
| `supabase/migrations/20261007170000_0039_team_history_storage.sql` | **New**                                                        |
| `types/supabase.ts`                                                | Extended `ingestion_team_sync_state`                           |

---

## 5. Database changes

**Migration `0039_team_history_storage`** (applied to Scorence dev via MCP):

- Partial indexes `fixtures_home_team_completed_kickoff_idx`, `fixtures_away_team_completed_kickoff_idx` (terminal + scored rows, kickoff desc).
- `ingestion_team_sync_state`: `last_repair_season_year`, `history_state jsonb`, `min_finished_target default 30`.

Existing uniques unchanged (`fixtures.provider_id`).

---

## 6. Tests added

| Area                                  | File                                               |
| ------------------------------------- | -------------------------------------------------- |
| Completeness thresholds / as-of logic | `lib/analytics/team-history-query.test.ts`         |
| Repair skip ≥30 / season walk         | `lib/ingestion/repair-team-history.test.ts`        |
| Aggregates last-20 slice              | `lib/analytics/team-aggregates.test.ts` (existing) |

---

## 7. Verification commands

```bash
npm.cmd run test:ci
npm.cmd run lint
npm.cmd run typecheck
```

**Results (2026-10-07, after changes):**

| Command                 | Result                                           |
| ----------------------- | ------------------------------------------------ |
| `npm.cmd run test:ci`   | **730 passed** (176 files), +14 vs 01-3 baseline |
| `npm.cmd run lint`      | **0 errors**, 13 warnings (pre-existing)         |
| `npm.cmd run typecheck` | **Passed**                                       |

---

## 8. API quota implications

| Path                   | Cost                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| League-season backfill | Unchanged (~paginated `/fixtures` per league-season)                               |
| Team repair            | ~1 request per season per team until 30–100 scored rows stored                     |
| Batch cron             | Default 5 teams/run (`TEAM_HISTORY_REPAIR_BATCH_SIZE`), 48s budget                 |
| Savings                | Overview no longer calls `last=8` when team already has ≥30 scored completed in DB |

---

## 9. Remaining limitations

1. **Repair cron not in GHA by default** — Route exists; schedule must be added to production workflow deliberately.
2. **Cross-competition mixing** — Storage includes all leagues in DB; scoped queries require explicit `leagueProviderIds`.
3. **Provider gaps** — If API has &lt;30 finished matches historically, state stays `DATA_INSUFFICIENT` (explicit, not padded).
4. **Backfill + repair share checkpoint** — Same `repair-team-history` cursor; safe but serializes concurrent runs.

---

## 10. Manual steps (operator)

1. **Production Supabase** (if not dev): apply migration `20261007170000_0039_team_history_storage.sql`.
2. **Initial depth:** `npm.cmd run backfill:historical-fixtures -- --tier=1 --resume`
3. **Verify:** `npm.cmd run diagnose:ingestion -- --team-id=42` and a mid-table team.
4. **Optional cron:** add `/api/cron/repair-team-history` to GitHub Actions (same auth as other crons in `scripts/trigger-production-cron.mjs`).
5. **Optional:** set `TEAM_HISTORY_REPAIR_ON_SYNC=1` on Vercel for piggyback repair after daily fixture sync.

---

## 11. Assumptions

- Relevant teams = clubs with fixtures in enabled leagues between UTC now−7d and now+21d.
- Minimum storage depth for “complete” = **30** scored terminal matches; target repair depth = **100**.
- `beforeAt` for prematch features remains fixture `kickoff_at` (UTC).
- Belgrade timezone used only for display/lifecycle elsewhere; all storage/query filters use UTC instants.
