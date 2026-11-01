# Audit 08-2 — Match page data flow and AI performance

**Date:** 2026-10-11  
**Prerequisites:** [08-1-match-page-states.md](./08-1-match-page-states.md), [07-1-live-ai.md](./07-1-live-ai.md), [06-2-ai-states.md](./06-2-ai-states.md)

---

## 1. Before — request waterfall

### RSC match page (`app/(app)/matches/[fixtureId]/page.tsx`)

| Wave | Requests                                                     | Parallelism                                 |
| ---- | ------------------------------------------------------------ | ------------------------------------------- |
| 1    | `getFixtureById`, `getCurrentUser`                           | Parallel                                    |
| 2    | `canAccessPremiumAnalytics`                                  | Sequential (after user) — **before change** |
| 3    | `isFixtureFavorited`, live snapshot (events + stats if live) | Parallel                                    |

`generateMetadata` performs an additional `getFixtureById` (Redis-backed service cache may dedupe within one navigation).

**Critical path:** Header and `MatchLiveSession` render from RSC fixture + optional SSR live snapshot. No server-side LLM await on page render. Prematch GET API may run `getOrComputePrematch` (prediction compute, not narrative LLM).

### RSC overview tab (`MatchOverviewPanel`)

1. `hydrateMatchOverviewFromProvider` (sequential gate)
2. Eleven DB/analytics reads in `Promise.all` (parallel after hydrate)

### Client — AI provider mount (before optimization)

| Phase    | Auth user | Parallel client fetches                                                                                           |
| -------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| Prematch | Yes       | `/api/ai/prematch/:id` GET, `/api/fixtures/:id/readiness`                                                         |
| Live     | Yes       | `/api/ai/live/:id`, historical prematch GET (same handler as prematch), `/api/matches/:id/live-probability-delta` |
| Live     | Guest     | Delta GET only                                                                                                    |
| Finished | Yes       | Prematch GET (historical) + delta — delta was **not** owned by provider (overview fallback query)                 |

### Vitest fetch-count baseline (pre-change behavior, measured via harness)

| Scenario               | prematch GET | readiness GET | live GET | delta GET | prematch POST |
| ---------------------- | ------------ | ------------- | -------- | --------- | ------------- |
| Prematch, insight OK   | 1            | 1             | 0        | 0         | 0             |
| Prematch, MISS + gates | 1            | ≥1            | 0        | 0         | 1             |
| Live, auth             | 1            | 0             | 1        | 1         | 0             |
| Live, guest            | 0            | 0             | 0        | 1         | 0             |
| Finished, auth         | ≥1           | 0             | 0        | 1         | 0             |

Concurrent prematch-shaped GETs share in-flight dedupe in `lib/ai/prematch-insight-fetch.ts` (one network call when overlapping).

---

## 2. Root performance problems

| ID    | Problem                                    | Impact                                                                                   |
| ----- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| PF-01 | AI `fixtureStatus` from SSR only           | NS→live on same session kept prematch queries enabled until full navigation              |
| PF-02 | Monolithic AI context                      | Delta/view updates re-rendered all `usePrematchInsight` consumers                        |
| PF-03 | Delta query split                          | Provider disabled delta on finished; `OverviewAiEngineCard` mounted fallback `useQuery`  |
| PF-04 | Provider `key` included status             | Remounted AI subtree on status change after navigation                                   |
| PF-05 | `refetch` / `ensurePrematch` unstable deps | Query object deps recreated actions context → extra re-renders                           |
| PF-06 | RSC overview hydrate                       | Sequential hydrate before parallel reads (tab TTFB)                                      |
| PF-07 | Readiness query key                        | Fixture-scoped only; artifact hash not in key (refetch + POST invalidation used instead) |

**Not a problem:** Live broadcast invalidates AI only on meaningful events / `liveInsightGenerated` ([`useLiveMatch`](../../hooks/useLiveMatch.ts)).

---

## 3. Changes

| Area                | Files                                                                                                                                                                  | Rationale                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Authoritative phase | [`AIInsightProvider.tsx`](../../components/ai/AIInsightProvider.tsx)                                                                                                   | `effectiveStatus` from `useMatchLiveContext()` ?? SSR prop                                                         |
| Delta ownership     | Same + [`OverviewAiEngineCard.tsx`](../../components/match/OverviewAiEngineCard.tsx)                                                                                   | `probabilityDelta` enabled for LIVE and FINISHED; removed overview fallback query                                  |
| Context split       | `AIInsightProvider.tsx`                                                                                                                                                | `AIInsightViewContext` + `AIInsightActionsContext`; exports `usePrematchInsightView` / `usePrematchInsightActions` |
| Stable actions      | `AIInsightProvider.tsx`                                                                                                                                                | `refetch` / `ensurePrematch` depend on `.refetch` fns, not whole query objects                                     |
| RQ defaults         | `AIInsightProvider.tsx`                                                                                                                                                | Shared `refetchOnMount: false`, `refetchOnWindowFocus: false`, `staleTime` 30s (60s historical)                    |
| Readiness refresh   | `AIInsightProvider.tsx`                                                                                                                                                | Invalidate readiness after successful prematch POST cache write                                                    |
| Provider key        | [`page.tsx`](<../../app/(app)/matches/[fixtureId]/page.tsx>)                                                                                                           | `fixtureId` + guest segment only (phase from live context)                                                         |
| RSC parallel        | `page.tsx`                                                                                                                                                             | `canAccessPremiumAnalytics` in same `Promise.all` as favorited/snapshot                                            |
| Tests               | [`AIInsightProvider.test.tsx`](../../components/ai/AIInsightProvider.test.tsx), [`useLiveMatch.invalidation.test.tsx`](../../hooks/useLiveMatch.invalidation.test.tsx) | Fetch counts, phase transition, cache identity, action re-render guard, broadcast rules                            |

**Database:** no migration.

---

## 4. After — behavior and metrics

### Client mount (after)

| Phase    | Auth  | Fetches (unchanged counts; better phase routing)                                |
| -------- | ----- | ------------------------------------------------------------------------------- |
| Prematch | Yes   | 1 prematch GET + 1 readiness (no POST unless MISS + gates + auto-ensure)        |
| Live     | Yes   | 1 live + 1 historical prematch GET + 1 delta                                    |
| Live     | Guest | 1 delta                                                                         |
| Finished | Yes   | 1 prematch (historical) + 1 delta via provider (no overview duplicate observer) |

### Phase transition

When live context reports `1H` while SSR still `NS`, provider enables live queries and disables prematch/readiness without remounting.

### Re-renders

`usePrematchInsightActions()` subscribers do not re-render when only `liveDelta` / view model fields change (verified in Vitest).

### Decomposition (task §6)

| Approach                               | Decision                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| Separate hooks each calling `useQuery` | **No** — would duplicate subscriptions                        |
| Split view vs actions context          | **Yes** — material reduction in action-only re-renders        |
| `useMatchAI` facade                    | **Not added** — `usePrematchInsight` remains the composed API |

### React Query audit (task §4)

| Query key                         | staleTime | refetchOnMount | refetchOnWindowFocus | enabled                          |
| --------------------------------- | --------- | -------------- | -------------------- | -------------------------------- |
| `liveKeys.prematchInsight(id)`    | 30s       | false          | false                | prematch phase, auth, analyzable |
| `liveKeys.historicalPrematch(id)` | 60s       | false          | false                | live phase, auth                 |
| `liveKeys.liveInsight(id)`        | 30s       | false          | false                | live phase, auth                 |
| `liveKeys.probabilityDelta(id)`   | 30s       | false          | false                | live **or finished**             |
| `[live, fixture-readiness, id]`   | 30s       | false          | false                | prematch phase, auth             |

Global `QueryProvider` still sets `staleTime: 15s` and `refetchOnWindowFocus: true`; AI queries override locally.

---

## 5. Tests

| Scenario                                        | File                                       |
| ----------------------------------------------- | ------------------------------------------ |
| Prematch/live/guest/finished fetch counts       | `components/ai/AIInsightProvider.test.tsx` |
| SSR stale status + live context                 | Same                                       |
| Live phase single deduped prematch-shaped GET   | Same                                       |
| Live context transition without extra readiness | Same                                       |
| Fixture cache isolation                         | Same                                       |
| GET failure non-blocking                        | Same                                       |
| Actions context stable on delta cache update    | Same                                       |
| Broadcast noop vs meaningful invalidation       | `hooks/useLiveMatch.invalidation.test.tsx` |
| Regression suite                                | `npm.cmd run test:ci`                      |

---

## 6. Remaining bottlenecks

- Overview tab: `hydrateMatchOverviewFromProvider` before parallel DB reads.
- Prematch GET: server-side `getOrComputePrematch` cost on cache miss.
- Metadata duplicate `getFixtureById` on navigations (mitigated by Redis service cache).
- Finished fixtures still fetch historical prematch GET alongside delta (product-correct; could lazy-load if overview AI deferred).

---

## 7. Verification

| Command                 | Result (2026-10-11, plan verification) |
| ----------------------- | -------------------------------------- |
| `npm.cmd run test:ci`   | **869 passed** (202 files)             |
| `npm.cmd run typecheck` | Passed                                 |
| `npm.cmd run lint`      | 0 errors, 13 warnings (pre-existing)   |

---

## 8. Assumptions

1. Vitest `fetch` call counts match browser network behavior for deduped prematch GET helpers.
2. `MatchLiveSession` wraps `AIInsightProvider` in production so live context is available for phase.
3. Europe/Belgrade lifecycle display policy unchanged; timestamps remain UTC in storage.
4. Finished-match prematch GET remains intentional for historical narrative in overview/hero.
5. Strict Mode double mount in tests may produce up to two sequential prematch-shaped GETs when queries remount; production single-mount expects one.
