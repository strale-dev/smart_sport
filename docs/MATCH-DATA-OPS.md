# Match data ops — golden path (Phase 8)

> **Roadmap:** [ROADMAP.md §16](./ROADMAP.md#16-phase-8--product-experience--launch-readiness-post-phase-5) (P8-DATA-*).  
> **Deep reference:** [scripts/INGESTION.md](./scripts/INGESTION.md). **Production:** [ING-3-pro-cutover.md](./ING-3-pro-cutover.md).

Match Details reads **Postgres only** in development when `API_FOOTBALL_INGEST_ONLY=true`. Empty cards mean **missing rows**, not missing React components. Phase 8 **16.1** must pass before calling the product “PRD-ready.”

---

## 5-minute dev golden path

1. **Env** (`.env.local`): `API_FOOTBALL_KEY`, Supabase URL + service role, `NEXT_PUBLIC_APP_ENV=development`, `API_FOOTBALL_INGEST_ONLY=true`.

2. **Sync + bootstrap** (runs only missing steps):

   ```bash
   npm.cmd run match:qa-sync
   ```

   Alias of `ingest:dev-qa`. Use `--dry-run` to preview, `--force` for full static → fixtures → match-details chain.

3. **Verify**:

   ```bash
   npm.cmd run match:verify
   ```

   Strict pinned QA gates. For one fixture:

   ```bash
   npm.cmd run diagnose:ingestion -- --fixture-id=1570355 --strict
   ```

4. **Open in browser** (after verify shows `overview OK` for FT pins):

   | URL                | Expect                                                                               |
   | ------------------ | ------------------------------------------------------------------------------------ |
   | `/matches/1570355` | FT — timeline, stats, lineups (when bootstrapped)                                    |
   | `/matches/1553856` | FT — partial xG case                                                                 |
   | `/matches/1552754` | NS — form/H2H may show; lineups often empty until ≤90 min pre-kickoff + lineups sync |

   Also used in ROADMAP manual QA: `/matches/1552750`.

---

## Why lineups / timeline are still empty

| Symptom                             | Cause                                       | Fix                                                                                |
| ----------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| Overview empty on **FT**            | No `fixture_events` / stats in DB           | `match:qa-sync` or `bootstrap:match-details`                                       |
| Overview empty on **NS**            | Pre-match: stats/timeline not published yet | Normal; use Form/H2H tabs; lineups via lineups sync near kickoff                   |
| **Lineups** tab empty on upcoming   | Provider has no lineup yet, or sync not run | Pro + `API_FOOTBALL_LINEUPS_SYNC_ENABLED=true` + `sync-lineups` (see INGESTION.md) |
| Form/H2H empty                      | Not enough historical fixtures in DB        | `backfill:historical-fixtures` (P8-DATA-9)                                         |
| Random match from `/fixtures` empty | Never ingested for that `provider_id`       | `bootstrap:match-details --fixture-ids=<id>` or production crons (P8-DATA-8)       |

---

## Phase 8 checklist (founder)

- [ ] **P8-DATA-4** — `match:qa-sync` + `match:verify` green locally.
- [ ] **P8-DATA-5** — Pro key when moving to live + standings + heavy sync ([ING-3](./ING-3-pro-cutover.md)).
- [ ] **P8-DATA-7** — Test lineups on real upcoming kickoff (≤90 min window).
- [ ] **P8-DATA-8** — Production ingestion off ingest-only; crons firing.

---

## npm aliases (Phase 8)

| Script          | Same as                       |
| --------------- | ----------------------------- |
| `match:qa-sync` | `ingest:dev-qa`               |
| `match:verify`  | `diagnose:ingestion --strict` |

Use `diagnose:ingestion` without `--strict` for exploratory reports; add `--fixture-id=` for a single match.
