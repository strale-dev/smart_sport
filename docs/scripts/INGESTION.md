# Ingestion ops (development)

Operational guide for API-Football → Postgres sync and bootstrap. Use **Windows** `npm.cmd` (see root `AGENTS.md`).

**Phase 8 shortcut:** [MATCH-DATA-OPS.md](../MATCH-DATA-OPS.md) — `match:qa-sync` + `match:verify`.

## Quick start (fresh dev DB)

1. Copy `.env.example` → `.env.local` with at least:
   - `API_FOOTBALL_KEY`
   - Supabase URL + anon + **service role**
   - `NEXT_PUBLIC_APP_ENV=development`
   - `API_FOOTBALL_INGEST_ONLY=true` (recommended — UI reads Postgres only)
2. Run the smart helper (only steps that are missing):

   ```bash
   npm.cmd run match:qa-sync
   ```

   (`match:qa-sync` = `ingest:dev-qa`)

3. Verify:

   ```bash
   npm.cmd run match:verify
   ```

4. Open pinned QA match URLs (see below).

**Dry run** (plan only, no API calls):

```bash
npm.cmd run ingest:dev-qa -- --dry-run
```

**Force full chain** (static → fixtures → match-details — uses more API quota):

```bash
npm.cmd run ingest:dev-qa -- --force
```

---

## Primary commands

| npm script                     | Purpose                                                                                                 | Typical API cost                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `match:qa-sync`                | Phase 8 golden path — alias of `ingest:dev-qa`                                                          | Variable                                         |
| `match:verify`                 | Phase 8 strict QA — alias of `diagnose:ingestion --strict`                                              | 0–2 req                                          |
| `diagnose:ingestion`           | Human-readable DB + pinned QA report; optional `--fixture-id=`, `--json`, `--strict`                    | 0 DB-only; +1–2 req if key present (quota probe) |
| `ingest:dev-qa`                | Diagnose then run **only missing** bootstrap/sync steps                                                 | Variable (skips when data exists)                |
| `verify:ingestion`             | **Phase 1 gate**: counts + fixtures UTC today (exit 1 if empty)                                         | 0                                                |
| `bootstrap:static-data`        | Leagues + current seasons (idempotent)                                                                  | ~7+ req                                          |
| `sync:fixtures`                | Allowlisted leagues, dev window today ±1 day                                                            | ~3 req                                           |
| `sync:standings`               | Standings for allowlist                                                                                 | ~7 req (Free plan may block current season)      |
| `sync:match-details`           | FT fixtures in recent window (cron-style)                                                               | High — batch                                     |
| `sync:lineups`                 | NS/TBD fixtures kicking off within 90 min (cron-style); skips complete lineups outside the final 60 min | ~1 req per fixture synced                        |
| `bootstrap:match-details`      | Pull stats/events/lineups for FT fixtures                                                               | ~3 req per fixture                               |
| `api-football:smoke`           | Provider auth + sample fixture + quota                                                                  | 1–2 req                                          |
| `backfill:historical-fixtures` | Historical fixture ingest                                                                               | Many req                                         |
| `backfill:elo`                 | Elo from finished fixtures                                                                              | 0 provider                                       |

Implementation entrypoints live under `scripts/` and `lib/ingestion/`.

---

## Pinned QA fixtures

Defined in `lib/qa/pinned-fixture-ids.ts`:

| Label         | Provider ID | Path               | Expectation                                                 |
| ------------- | ----------- | ------------------ | ----------------------------------------------------------- |
| `ftWithXg`    | 1570355     | `/matches/1570355` | FT with stats + events (+ xG when bootstrapped)             |
| `ftWithoutXg` | 1553856     | `/matches/1553856` | FT overview data without xG emphasis                        |
| `nsNoLineups` | 1552754     | `/matches/1552754` | Pre-match; lineups often empty until `sync-lineups` (ING-1) |

ROADMAP also references `/matches/1552750` for manual FT QA. Default `ingest:dev-qa` match-details targets: `1570355`, `1552750`, `1553856`.

---

## Free vs Pro

| Capability               | Free (dev)                                                                                                       | Pro (production gate)                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Daily API budget         | ~100 req                                                                                                         | ~7,500 req                                                                                            |
| Fixture window           | ±1 day                                                                                                           | ±7 days                                                                                               |
| Standings current season | Often blocked                                                                                                    | Expected to work                                                                                      |
| Lineups cron             | Vercel cron every 15 min; body off in dev unless `API_FOOTBALL_LINEUPS_SYNC_ENABLED=true`; manual `sync:lineups` | Body on when `NEXT_PUBLIC_APP_ENV=production` (or explicit `true`); use `false` kill-switch until Pro |
| Live polling             | Limited                                                                                                          | Required for Phase 5                                                                                  |

See `docs/Tech.md` §9.3. Full Vercel Production env + **ING-3** Pro cutover runbook: [ING-3-pro-cutover.md](../ING-3-pro-cutover.md). **ING-2** (lineups in `vercel.json` + config gate) is separate from the standings schedule (**ING-3**).

---

## Vercel Production rollout (summary)

Canonical checklist: [ING-3-pro-cutover.md](../ING-3-pro-cutover.md).

- **`NEXT_PUBLIC_APP_ENV=production`** — wider fixture window (±7 days); lineups sync **on** by default unless kill-switch is set. Other crons (fixtures, standings, match-details) still run when auth passes; only **lineups** no-ops when `lineupsSyncEnabled` is false.
- **`API_FOOTBALL_LINEUPS_SYNC_ENABLED=false`** — use on Production until Pro cutover; remove or set `true` after.
- **`CRON_SECRET`** — required on Production; missing → 401 on cron routes.
- **Pro key + `API_FOOTBALL_DAILY_LIMIT=7500`** before relying on lineups cron body or on-demand provider reads.
- **Verify:** Vercel Cron logs or `GET /api/cron/sync-lineups` with `Authorization: Bearer <CRON_SECRET>` — expect `skipped: true` while the lineups kill-switch is on.

---

## Troubleshooting

| Symptom                                     | Check                                                 | Fix                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Match header only, Overview empty on **FT** | `npm.cmd run diagnose:ingestion -- --fixture-id=<id>` | If stats/events = 0 → `bootstrap:match-details` or `ingest:dev-qa`. If rows exist → UI wiring (Overview B1+). |
| No fixtures on `/fixtures`                  | `diagnose:ingestion` → fixtures today UTC             | `sync:fixtures`                                                                                               |
| Phase 1 `verify:ingestion` fails            | Same as above                                         | `sync:fixtures`                                                                                               |
| Lineups tab empty on **NS**                 | Kickoff within 90 min? `lineupsSyncEnabled`?          | `sync:lineups` or production cron (every 15 min when enabled)                                                 |
| Standings tabs empty                        | Free API season                                       | Pro key + `sync:standings`                                                                                    |
| Provider errors                             | `api-football:smoke`                                  | Fix `API_FOOTBALL_KEY`                                                                                        |

### Overview expectations by status

- **NS**: Overview shows team comparison, then form preview and H2H preview, players to watch, and a lineup teaser (XI list + CTA to the Lineups tab). Full form and H2H (toggles, full lists) live on the **Matches** tab; full pitch lineups live on **Lineups**.
- **FT / live**: Overview order is live stats → momentum → comparison → timeline → players to watch → lineup teaser (probability delta when available). Needs **stats and/or events** in Postgres for timeline/stats/momentum cards.

---

## Related phase checks

- `npm.cmd run phase1:check` — includes `verify:ingestion`
- `npm.cmd run phase3:check` — match smoke after bootstrap
- `npm.cmd run ui-b3:smoke` — regression after Overview fixes
