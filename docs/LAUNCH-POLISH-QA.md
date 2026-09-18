# Launch polish — manual QA checklist

Quick smoke after Phase 7 product polish changes.

## Predictions Center

- [ ] Incognito `/predictions` shows blur + signup CTA (no redirect to login).
- [ ] Signed-in user sees list or honest empty state with CTAs.
- [ ] Pick cards show disclaimer footer and “View analysis” links.

## Landing

- [ ] Hero showcase uses real fixture when DB has today’s NS/TBD fixtures (no “Demo data” badge).
- [ ] Waitlist CTA still works on `/`.

## Legal & cookies

- [ ] App footer shows AI disclaimer + Privacy / Terms / Methodology / Cookie settings.
- [ ] Cookie banner: reject non-essential → PostHog does not capture until opt-in.
- [ ] Privacy and Terms pages load; `legalMeta.lastUpdated` reflects self-review.

## Errors

- [ ] Unknown URL shows branded 404 with Home / Fixtures / Login.
- [ ] Global error boundary shows branded 500 (trigger only if needed in dev).

## Empty states

- [ ] Spot-check league, team, player, fixtures, live — empty views include at least one CTA.
