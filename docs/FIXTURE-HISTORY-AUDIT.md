# Fixture history audit (baseline)

Reference for the fixture / historical data layer upgrade. See [ROADMAP.md](./ROADMAP.md) P8-DATA-9.

## DB snapshot (Scorence dev, 2026-09-25)

| Metric                          | Value                  |
| ------------------------------- | ---------------------- |
| Total fixtures                  | ~7,009                 |
| Past / future (by `kickoff_at`) | ~6,785 / ~224          |
| Seasons with bulk data          | 2024–2026 (~2.4k each) |
| Arsenal (provider 42)           | ~111 finished          |
| Top clubs                       | ~96–119 fixtures each  |

## Bottlenecks (pre-upgrade)

| Layer                          | Limit                                                                      | Effect                                         |
| ------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------- |
| Cron `sync-fixtures`           | ±7 days (prod)                                                             | Only recent dates ingested daily               |
| `backfill:historical-fixtures` | 3 seasons, terminal-only, no pagination                                    | ~100–120 matches per top team                  |
| `getFixturesForTeam`           | 30 past days                                                               | UI could not show deep history from DB         |
| Fixtures page                  | ±7 days                                                                    | Narrow discovery window                        |
| Form / AI                      | 3–10 match aggregates                                                      | LLM sees small sample, not missing UI list cap |
| API client                     | `/fixtures` does not support `page`; single request per league/season/date | Large cups may need `round` splits later       |

## Architecture (source of truth)

- **Persist:** `fixtures.provider_id` UNIQUE, `ingestFixtureFromRaw` upsert.
- **Read (post-upgrade):** Postgres via `readFixturesForTeamFromDb` + pagination; Redis cache on service layer.
- **Backfill:** Tiered league-season + team gap-fill; checkpoints in `ingestion_league_season_state`.

## Ops

- Historical: `npm.cmd run backfill:historical-fixtures -- --tier=1 --resume`
- Coverage: `npm.cmd run diagnose:ingestion -- --team-id=42`
- Ingestion guide: [scripts/INGESTION.md](./scripts/INGESTION.md)
