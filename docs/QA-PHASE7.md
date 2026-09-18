# Phase 7 Quality — QA checklist

Automated gates: `npm.cmd run phase7:check` (fast) and `npm.cmd run phase7:check:full` (Lighthouse + axe + k6 if installed).

## Setup

1. Copy QA credentials into **`.env.local`** (never commit):

   ```env
   PLAYWRIGHT_QA_EMAIL=qa@scorence.app
   PLAYWRIGHT_QA_PASSWORD=<your-password>
   PHASE6_QA_USER_ID=7b6576b0-2b9a-4b00-8016-39b2af5fe16e
   ```

2. Sync dev data: `npm.cmd run match:qa-sync`

3. Pinned fixtures: [lib/qa/pinned-fixture-ids.ts](../lib/qa/pinned-fixture-ids.ts)

   | ID      | Use                           |
   | ------- | ----------------------------- |
   | 1570355 | FT with xG — primary match QA |
   | 1553856 | FT partial (no xG)            |
   | 1552754 | NS, no lineups — locked AI    |

## Automated commands

| Command                                       | Purpose                                               |
| --------------------------------------------- | ----------------------------------------------------- |
| `npm.cmd run phase7:check`                    | typecheck, lint, test, PRD audit, LCP static          |
| `npm.cmd run phase7:check:full`               | above + axe + Lighthouse + k6 (if k6 installed)       |
| `npm.cmd run quality:axe`                     | critical axe on `/`, `/dashboard`, `/matches/1570355` |
| `npm.cmd run quality:lighthouse`              | Requires `build && start` or `QUALITY_BASE_URL`       |
| `npm.cmd run e2e:auth-setup`                  | Saves `playwright/.auth/user.json`                    |
| `node scripts/k6/export-supabase-session.mjs` | Writes `.k6-auth.env` for k6                          |
| `npm.cmd run quality:k6`                      | 50 VU, 70% match / 30% dashboard                      |

**Vercel preview sign-off:**

```powershell
$env:QUALITY_BASE_URL="https://<preview>.vercel.app"
npm.cmd run quality:lighthouse
```

## Manual browser matrix

Preconditions: cookie consent exercised once per browser; test guest and signed-in (`qa@scorence.app`).

### Desktop

| Route                    | Chrome | Firefox | Safari |
| ------------------------ | ------ | ------- | ------ |
| `/` landing              | ☐      | ☐       | ☐      |
| `/fixtures`              | ☐      | ☐       | ☐      |
| `/live`                  | ☐      | ☐       | ☐      |
| `/dashboard` (signed in) | ☐      | ☐       | ☐      |
| `/matches/1570355`       | ☐      | ☐       | ☐      |
| `/pricing`               | ☐      | ☐       | ☐      |
| `/login` → dashboard     | ☐      | ☐       | ☐      |

Checks: no horizontal page scroll at 1280px; focus visible on tab nav; AI disclaimer on AI cards; empty/error states not dead-ends.

### Mobile

| Route                    | iOS Safari | Android Chrome |
| ------------------------ | ---------- | -------------- |
| `/matches/1570355`       | ☐          | ☐              |
| `/fixtures` + bottom nav | ☐          | ☐              |
| `/dashboard` signed in   | ☐          | ☐              |

Checks: 375px width, tappable nav, tab bar scroll on match page.

## PRD §4 principles (manual)

1. **Data before narrative** — AI text matches visible stats on match page.
2. **Prediction before prose** — probabilities shown before long AI copy.
3. **No fake data** — no placeholder scores/form in production routes.
4. **Live means live** — live match shows updating status (if live fixture available).
5. **Uncertainty visible** — confidence + data quality chips on AI surfaces.
6. **Premium simplicity** — scan-friendly hierarchy on dashboard/match.
7. **All states** — loading/empty/error on dashboard, fixtures, favorites.
8. **Not betting** — no odds/bookmaker copy.
9. **Tone** — serious, no gimmicky gambling CTAs.

## Sign-off

| Gate                       | Target                         | Result | Date |
| -------------------------- | ------------------------------ | ------ | ---- |
| Lighthouse mobile (match)  | perf ≥ 80, a11y ≥ 95           |        |      |
| Lighthouse desktop (match) | perf ≥ 90, a11y ≥ 95           |        |      |
| axe critical               | 0 on match, dashboard, landing |        |      |
| k6 50 VU                   | p95 < 3s, errors < 1%          |        |      |
| Preview URL                |                                |        |      |
