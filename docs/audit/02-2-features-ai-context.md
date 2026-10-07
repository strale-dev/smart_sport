# Audit 02-2 — History feature layer + compact AI context

**Date:** 2026-10-07  
**Prerequisites:** [02-1-history-storage.md](./02-1-history-storage.md)

---

## 1. Audit summary (pre-change)

Historical rows are queried PIT via [`team-history-query.ts`](../lib/analytics/team-history-query.ts). Prematch **model** features used [`point-in-time.ts`](../lib/analytics/point-in-time.ts) (`beforeAt = kickoff_at`). Prematch **AI context** used [`analyticsService.getRecentForm`](../lib/services/analyticsService.ts) / `getH2H` without `beforeAt`, so post-kickoff results could leak into narratives for finished fixtures. Aggregates in [`team-aggregates.ts`](../lib/analytics/team-aggregates.ts) exposed last-N form only (no BTTS/O-U, recency weighting, or explicit xG unavailability). H2H was unweighted and uncapped for LLM influence.

**Post-change:** fixture-scoped [`buildFixtureHistoryFeatures`](../lib/analytics/fixture-history-features.ts) drives prematch AI context with recency-weighted windows, explicit `available` / `unavailable` metrics, isolated H2H, and bounded [`analyticsCompact`](../lib/analytics/compact-ai-context.ts).

---

## 2. Feature layer

| File                                                                          | Role                                                        |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [`history-feature-types.ts`](../lib/analytics/history-feature-types.ts)       | Metric contract, window keys, team/H2H/fixture bundles      |
| [`recency-weight.ts`](../lib/analytics/recency-weight.ts)                     | Exponential decay, weighted mean/rate, weight cap helper    |
| [`history-window-metrics.ts`](../lib/analytics/history-window-metrics.ts)     | Pure window metrics (BTTS, O/U, xG, period compare)         |
| [`fixture-xg-batch.ts`](../lib/analytics/fixture-xg-batch.ts)                 | Batch xG load; shared with `computeTeamXgAveragesBefore`    |
| [`opponent-strength.ts`](../lib/analytics/opponent-strength.ts)               | PIT Elo replay → opponent rating at kickoff per fixture     |
| [`team-history-context.ts`](../lib/analytics/team-history-context.ts)         | Load PIT rows, scope filter, form results                   |
| [`team-history-features.ts`](../lib/analytics/team-history-features.ts)       | `buildTeamHistoryFeatures` (ALL/HOME/AWAY × 5/10/20/30/30+) |
| [`fixture-h2h-features.ts`](../lib/analytics/fixture-h2h-features.ts)         | Isolated H2H with recency + influence cap                   |
| [`fixture-history-features.ts`](../lib/analytics/fixture-history-features.ts) | `buildFixtureHistoryFeatures(fixtureExternalId)`            |
| [`compact-ai-context.ts`](../lib/analytics/compact-ai-context.ts)             | Bounded LLM payload + form slice helpers                    |
| [`point-in-time.ts`](../lib/analytics/point-in-time.ts)                       | H2H scored filter; xG delegates to batch helper             |

Contextual history: all team queries use `kickoff_at < beforeAt` (fixture kickoff UTC). Windows 5/10/20/30/30+ (100 cap) with scopes ALL/HOME/AWAY. Optional league-first window via `buildMultiSeasonCompletedWindow`.

---

## 3. AI context changes

| File                                                         | Change                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [`types/ai.ts`](../types/ai.ts)                              | `PrematchAiContext.analyticsCompact`                                                   |
| [`aiContextService.ts`](../lib/services/aiContextService.ts) | Prematch path uses PIT `buildFixtureHistoryFeatures`; hash includes `analyticsCompact` |
| [`team-aggregates.ts`](../lib/analytics/team-aggregates.ts)  | `toPrematchSlice` no longer forces `ppg: 0` when missing                               |

Live prematch context still uses `getRecentForm` / `getH2H` (non-PIT) — unchanged in this task.

---

## 4. Recency and H2H parameters

**Decay:** `w = exp(-λ × ageDays)`, `λ = ln(2) / halfLifeDays`.

| Window   | Half-life (days) |
| -------- | ---------------- |
| 5        | 14               |
| 10       | 21               |
| 20       | 45               |
| 30 / 30+ | 90               |

**H2H:** half-life 21d (10-meeting window); raw weights normalized so total ≤ `H2H_EFFECTIVE_MEETING_CAP` (= **5**). H2H kept separate from team rolling stats.

**Compact context:** `MAX_RECENT_EXAMPLES = 3` per team; `MAX_COMPACT_CONTEXT_BYTES = 16384`.

---

## 5. Tests and verification

| Area                            | File                                             |
| ------------------------------- | ------------------------------------------------ |
| Recency                         | `lib/analytics/recency-weight.test.ts`           |
| Window metrics / xG unavailable | `lib/analytics/history-window-metrics.test.ts`   |
| Team isolation / scope          | `lib/analytics/team-history-features.test.ts`    |
| H2H cap                         | `lib/analytics/fixture-h2h-features.test.ts`     |
| PIT filter                      | `lib/analytics/fixture-history-features.test.ts` |
| Compact size / xG               | `lib/analytics/compact-ai-context.test.ts`       |
| AI prompt smoke                 | `lib/services/aiContextService.test.ts`          |

```bash
npm.cmd run test:ci
npm.cmd run lint
npm.cmd run typecheck
```

**Results (2026-10-07, after changes):**

| Command                 | Result                                                            |
| ----------------------- | ----------------------------------------------------------------- |
| `npm.cmd run test:ci`   | **749 passed** (182 files), +19 vs 02-1 baseline                  |
| `npm.cmd run lint`      | **0 errors**, 13 warnings (pre-existing; no new errors from 02-2) |
| `npm.cmd run typecheck` | **Passed**                                                        |

---

## 6. API quota implications

| Path                       | Cost                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Feature / AI context build | **0** API-Football calls — Postgres only (`fixtures`, `fixture_statistics`, `teams`)     |
| Elo replay                 | Extra DB read (bounded `limit 5000` on team+opponent fixture set per team feature build) |

Prematch insight cache keys change once (context hash includes `analyticsCompact`).

---

## 7. Remaining limitations

1. **Match UI form/H2H** — [`analyticsService`](../lib/services/analyticsService.ts) still “latest fixtures” for pages; not PIT.
2. **Elo replay cost** — derived at request time; no materialized Elo time series.
3. **Squad changes** — not in provider DB; H2H does not adjust for roster turnover.
4. **Cross-competition** — league-first fill when `leagueProviderId` set; otherwise all stored competitions in window.
5. **Logistic model** — [`buildPrematchFeatures`](../lib/models/features.ts) unchanged (simple last-5 means); rich layer primarily for AI/analytics hooks.
6. **`historicalContext.seasonPpg`** — no longer filled from aggregates in AI path (compact trends replace depth).

---

## 8. Assumptions

- `beforeAt` for prematch features = fixture `kickoff_at` (UTC).
- Opponent strength / schedule difficulty both use recency-weighted mean opponent Elo at kickoff from replay (same numeric signal).
- xG unavailable when no fixture pair has both teams’ `expected_goals` in window — never imputed as zero.
- H2H for AI prefers `SAME_COMP` when meetings exist, else `ALL`.
- Belgrade timezone not used in feature math (UTC only).
