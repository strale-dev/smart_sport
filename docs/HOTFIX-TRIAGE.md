# Launch hotfix triage (Weeks 9–10)

Parallel process while shipping post-launch ops work. **Twice per week (~30 min).**

## Sentry

1. Open **Issues** filtered to Production, sorted by last seen.
2. **P0 (same day):** user-visible wrong data, auth/billing broken, crash on golden paths (`/matches/[id]`, `/dashboard`, checkout).
3. **P1 (this week):** perf regressions, noisy errors with high volume.
4. Fix with minimal diff; run `npm.cmd run typecheck`, `lint`, `test`.

Launch DoD: no critical issues in 24h post-launch (or hotfixed same day).

## PostHog

1. Error tracking / session replays for spikes after deploys.
2. Funnel anomalies (`signup_completed`, `trial_started`) — confirm infra vs product.

## After fix

- Note one line in the PR or commit message referencing the Sentry issue ID.
- Optional: resolve or snooze only when verified in Production.
