// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  renderHook,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AIInsightProvider,
  usePrematchInsight,
  usePrematchInsightActions,
  usePrematchInsightView,
} from "@/components/ai/AIInsightProvider";
import type {
  LiveInsightResponse,
  PrematchInsightResponse,
} from "@/lib/ai/schemas";
import type { PrematchPredictionResult } from "@/types/prediction";
import { __resetLiveInsightFetchCacheForTests } from "@/lib/ai/live-insight-fetch";
import { __resetPrematchInsightFetchCacheForTests } from "@/lib/ai/prematch-insight-fetch";
import { liveKeys } from "@/lib/live/query-keys";
import type { LiveProbabilityDeltaResponse } from "@/lib/live/live-probability-delta";

vi.mock("@/lib/posthog/client", () => ({
  captureClientEvent: vi.fn(),
}));

const liveContextRef: {
  value: {
    fixture: { status: string; externalId: number };
    isLive: boolean;
  } | null;
} = { value: null };

vi.mock("@/components/match/MatchLiveSession", () => ({
  useMatchLiveContext: () => liveContextRef.value,
}));

const FIXTURE_ID = 1001;
const KICKOFF_SOON = new Date(Date.now() + 12 * 3_600_000).toISOString();

const baseInsight = {
  id: "insight-1",
  fixtureExternalId: FIXTURE_ID,
  fixtureId: "fixture-uuid",
  predictionId: "pred-1",
  contextHash: "hash",
  openaiModel: "gpt-4o-mini",
  promptVersion: "1.0.0",
  createdAt: "2026-01-01T12:00:00.000Z",
  cached: true,
  summary: "Home edge in form.",
  advantage: "HOME" as const,
  winOutcome: "1" as const,
  winProbabilities: { home: 0.48, draw: 0.27, away: 0.25 },
  expectedGoalsRange: [2, 3] as [number, number],
  weakerTeamScoringChance: 0.31,
  confidence: "MEDIUM" as const,
  keyFactors: [],
  scenarios: {
    likely: "Home win",
    best: "Comfortable home win",
    upset: "Away counter",
  },
  commentary: "Model favors home.",
  dataUsed: ["Model prediction"],
  dataTimestamp: "2026-01-01T12:00:00.000Z",
  dataQuality: "PARTIAL" as const,
  dataCoverage: null,
  analysis: null,
};

const basePrediction = {
  type: "PREMATCH" as const,
  presentationKind: "PRE_MATCH_PROBABILITY" as const,
  modelTier: "FIXTURE_SPECIFIC" as const,
  inputSnapshotFingerprint: "fp-1",
  expectedGoalsAvailable: true,
  fixtureExternalId: FIXTURE_ID,
  fixtureId: "fixture-uuid",
  modelVersionId: "mv-1",
  modelVersion: "1.0.0",
  predictionId: "pred-1",
  inputSnapshot: {
    form5HomePpg: 1.8,
    form5AwayPpg: 1.1,
  } as PrematchPredictionResult["inputSnapshot"],
  createdAt: "2026-01-01T12:00:00.000Z",
  fromCache: true,
  winProbabilities: { home: 0.48, draw: 0.27, away: 0.25 },
  predictedOutcome: "1" as const,
  expectedGoalsHome: 1.5,
  expectedGoalsAway: 1.1,
  expectedGoalsTotal: 2.6,
  expectedGoalsTotalMin: 2,
  expectedGoalsTotalMax: 3,
  over2Prob: 0.5,
  over3Prob: 0.28,
  under2Prob: 0.5,
  bttsProb: 0.52,
  weakerTeamScoringProb: 0.31,
  confidence: "MEDIUM" as const,
} satisfies PrematchPredictionResult;

function readinessSnapshot() {
  return {
    version: 1 as const,
    phase: "AI_READY" as const,
    evaluatedAt: "2026-01-01T12:00:00.000Z",
    timezonePolicy: "Europe/Belgrade" as const,
    liveSubState: null,
    gates: {
      predictionReady: true,
      predictionFresh: true,
      aiContextReady: true,
      aiGenerationAllowed: true,
      liveDataCurrent: false,
      historicalDataSufficient: true,
    },
    artifacts: {
      prediction: {
        predictionId: "pred-1",
        createdAt: "2026-01-01T12:00:00.000Z",
        isOfficial: true,
        fingerprint: "fp-1",
        stale: false,
      },
      aiPrematch: {
        contextHash: "hash",
        matchesCurrentInputs: true,
        stale: false,
      },
    },
    items: [],
  };
}

type FetchCounts = {
  prematchGet: number;
  prematchPost: number;
  readinessGet: number;
  liveGet: number;
  deltaGet: number;
};

function createFetchRouter(handlers: {
  prematchGet?: () => PrematchInsightResponse;
  prematchPost?: () => PrematchInsightResponse;
  liveGet?: () => LiveInsightResponse;
  deltaGet?: () => LiveProbabilityDeltaResponse;
}) {
  const counts: FetchCounts = {
    prematchGet: 0,
    prematchPost: 0,
    readinessGet: 0,
    liveGet: 0,
    deltaGet: 0,
  };

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const method = init?.method ?? "GET";

      if (url.includes(`/api/fixtures/${FIXTURE_ID}/readiness`)) {
        counts.readinessGet += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({ readiness: readinessSnapshot() }),
        };
      }

      if (url.includes(`/api/ai/prematch/${FIXTURE_ID}`)) {
        if (method === "POST") {
          counts.prematchPost += 1;
          return {
            ok: true,
            status: 200,
            json: async () =>
              handlers.prematchPost?.() ?? {
                status: "OK",
                insight: baseInsight,
                prediction: basePrediction,
                cached: false,
                insightMode: "prematch",
              },
          };
        }
        counts.prematchGet += 1;
        return {
          ok: true,
          status: 200,
          json: async () =>
            handlers.prematchGet?.() ?? {
              status: "OK",
              insight: baseInsight,
              prediction: basePrediction,
              cached: true,
              insightMode: "prematch",
            },
        };
      }

      if (url.includes(`/api/ai/live/${FIXTURE_ID}`)) {
        counts.liveGet += 1;
        return {
          ok: true,
          status: 200,
          json: async () =>
            handlers.liveGet?.() ??
            ({
              status: "OK",
              insight: baseInsight,
              prediction: basePrediction,
              cached: true,
              insightMode: "live",
            } as unknown as LiveInsightResponse),
        };
      }

      if (url.includes(`/api/matches/${FIXTURE_ID}/live-probability-delta`)) {
        counts.deltaGet += 1;
        return {
          ok: true,
          status: 200,
          json: async () =>
            handlers.deltaGet?.() ??
            ({
              prematch: { home: 0.5, draw: 0.25, away: 0.25 },
              prematchKind: "PRE_MATCH_PROBABILITY",
              live: { home: 0.55, draw: 0.2, away: 0.25 },
              liveKind: "LIVE_PROBABILITY",
              liveMinute: 55,
              liveAvailable: true,
              unavailableReason: null,
              sourceSnapshot: null,
              prematchPrediction: null,
              livePrediction: null,
            } satisfies LiveProbabilityDeltaResponse),
        };
      }

      throw new Error(`Unhandled fetch: ${method} ${url}`);
    }
  );

  vi.stubGlobal("fetch", fetchMock);

  return { counts, fetchMock };
}

function Probe() {
  usePrematchInsight();
  return <div data-testid="probe">ok</div>;
}

function renderProvider(options: {
  fixtureStatus?: string;
  isGuest?: boolean;
  fixtureId?: number;
  client?: QueryClient;
}) {
  const client =
    options.client ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

  return render(
    <QueryClientProvider client={client}>
      <AIInsightProvider
        fixtureId={options.fixtureId ?? FIXTURE_ID}
        fixtureStatus={options.fixtureStatus ?? "NS"}
        kickoffAt={KICKOFF_SOON}
        isGuest={options.isGuest ?? false}
      >
        <Probe />
      </AIInsightProvider>
    </QueryClientProvider>
  );
}

async function waitForIdle() {
  await waitFor(() => {
    expect(document.querySelector('[data-testid="probe"]')).toBeTruthy();
  });
  await waitFor(() => {
    expect(vi.mocked(global.fetch).mock.calls.length).toBeGreaterThan(0);
  });
}

describe("AIInsightProvider data flow", () => {
  beforeEach(() => {
    liveContextRef.value = null;
    __resetPrematchInsightFetchCacheForTests();
    __resetLiveInsightFetchCacheForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    __resetPrematchInsightFetchCacheForTests();
    __resetLiveInsightFetchCacheForTests();
  });

  it("prematch auth with insight OK: one prematch GET and one readiness GET, no POST", async () => {
    const { counts } = createFetchRouter({});
    renderProvider({ fixtureStatus: "NS" });
    await waitForIdle();
    await waitFor(() => {
      expect(counts.prematchGet).toBe(1);
      expect(counts.readinessGet).toBe(1);
      expect(counts.prematchPost).toBe(0);
    });
  });

  it("prematch auth MISS with gates open auto-ensures once", async () => {
    const { counts } = createFetchRouter({
      prematchGet: () => ({
        status: "MISS",
        fixtureExternalId: FIXTURE_ID,
        prediction: basePrediction,
      }),
    });
    renderProvider({ fixtureStatus: "NS" });
    await waitFor(() => {
      expect(counts.prematchPost).toBe(1);
    });
    expect(counts.prematchGet).toBe(1);
    expect(counts.readinessGet).toBeGreaterThanOrEqual(1);
  });

  it("live auth: live GET, one prematch-shaped GET, delta GET (deduped network prematch GET)", async () => {
    const { counts } = createFetchRouter({});
    renderProvider({ fixtureStatus: "1H" });
    await waitFor(() => {
      expect(counts.liveGet).toBe(1);
      expect(counts.deltaGet).toBe(1);
    });
    expect(counts.prematchGet).toBe(1);
    expect(counts.readinessGet).toBe(0);
  });

  it("live guest: delta GET only", async () => {
    const { counts } = createFetchRouter({});
    renderProvider({ fixtureStatus: "1H", isGuest: true });
    await waitFor(() => {
      expect(counts.deltaGet).toBe(1);
    });
    expect(counts.liveGet).toBe(0);
    expect(counts.prematchGet).toBe(0);
  });

  it("finished fixture loads probability delta via provider", async () => {
    const { counts } = createFetchRouter({});
    renderProvider({ fixtureStatus: "FT" });
    await waitFor(() => {
      expect(counts.deltaGet).toBe(1);
    });
    expect(counts.prematchGet).toBeGreaterThanOrEqual(1);
  });

  it("live auth: exactly one prematch-shaped GET for historical + deduped network", async () => {
    const { counts } = createFetchRouter({});
    renderProvider({ fixtureStatus: "1H" });
    await waitFor(() => {
      expect(counts.liveGet).toBe(1);
      expect(counts.deltaGet).toBe(1);
      expect(counts.prematchGet).toBe(1);
    });
    expect(counts.readinessGet).toBe(0);
    expect(counts.prematchPost).toBe(0);
  });

  it("transitions to live phase without extra readiness fetches when live context updates", async () => {
    const { counts } = createFetchRouter({});
    liveContextRef.value = null;

    function LivePhaseDriver({ children }: { children: ReactNode }) {
      const [, setTick] = useState(0);
      return (
        <>
          <button
            type="button"
            data-testid="go-live"
            onClick={() => {
              liveContextRef.value = {
                fixture: { status: "1H", externalId: FIXTURE_ID },
                isLive: true,
              };
              setTick((t) => t + 1);
            }}
          />
          {children}
        </>
      );
    }

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
      >
        <LivePhaseDriver>
          <AIInsightProvider
            fixtureId={FIXTURE_ID}
            fixtureStatus="NS"
            kickoffAt={KICKOFF_SOON}
            isGuest={false}
          >
            <Probe />
          </AIInsightProvider>
        </LivePhaseDriver>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(counts.prematchGet).toBe(1);
      expect(counts.readinessGet).toBe(1);
    });

    fireEvent.click(screen.getByTestId("go-live"));

    await waitFor(() => {
      expect(counts.liveGet).toBe(1);
      expect(counts.deltaGet).toBe(1);
    });

    expect(counts.readinessGet).toBe(1);
    expect(counts.prematchPost).toBe(0);
    expect(counts.prematchGet).toBeLessThanOrEqual(2);
  });

  it("uses live context status when SSR status is stale (NS → live)", async () => {
    const { counts } = createFetchRouter({});
    liveContextRef.value = {
      fixture: { status: "1H", externalId: FIXTURE_ID },
      isLive: true,
    };
    renderProvider({ fixtureStatus: "NS" });
    await waitFor(() => {
      expect(counts.liveGet).toBe(1);
      expect(counts.deltaGet).toBe(1);
    });
    expect(counts.prematchGet).toBeGreaterThanOrEqual(1);
    expect(counts.prematchGet).toBeLessThanOrEqual(2);
    expect(counts.readinessGet).toBe(0);
  });

  it("isolates react-query cache per fixture id", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const otherId = 2002;
    createFetchRouter({});

    const { unmount } = render(
      <QueryClientProvider client={client}>
        <AIInsightProvider
          fixtureId={FIXTURE_ID}
          fixtureStatus="NS"
          kickoffAt={KICKOFF_SOON}
          isGuest={false}
        >
          <Probe />
        </AIInsightProvider>
      </QueryClientProvider>
    );
    await waitForIdle();
    unmount();

    vi.mocked(global.fetch).mockClear();
    createFetchRouter({});

    render(
      <QueryClientProvider client={client}>
        <AIInsightProvider
          fixtureId={otherId}
          fixtureStatus="NS"
          kickoffAt={KICKOFF_SOON}
          isGuest={false}
        >
          <Probe />
        </AIInsightProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const keyA = liveKeys.prematchInsight(FIXTURE_ID);
      const keyB = liveKeys.prematchInsight(otherId);
      expect(client.getQueryData(keyA)).toBeDefined();
      expect(client.getQueryData(keyB)).toBeUndefined();
    });
  });

  it("prematch GET failure surfaces error without crashing children", async () => {
    createFetchRouter({});
    vi.mocked(global.fetch).mockImplementation(
      async (input, init): Promise<Response> => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url;
        if (
          url.includes(`/api/ai/prematch/${FIXTURE_ID}`) &&
          (init?.method ?? "GET") === "GET"
        ) {
          return { ok: false, status: 500, json: async () => ({}) } as Response;
        }
        if (url.includes(`/api/fixtures/${FIXTURE_ID}/readiness`)) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ readiness: readinessSnapshot() }),
          } as Response;
        }
        throw new Error(`Unhandled ${url}`);
      }
    );

    renderProvider({ fixtureStatus: "NS" });
    await waitFor(() => {
      expect(document.querySelector('[data-testid="probe"]')).toBeTruthy();
    });
  });

  it("actions context keeps stable callbacks when only liveDelta changes", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    createFetchRouter({});

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <AIInsightProvider
          fixtureId={FIXTURE_ID}
          fixtureStatus="1H"
          kickoffAt={KICKOFF_SOON}
          isGuest={false}
        >
          {children}
        </AIInsightProvider>
      </QueryClientProvider>
    );

    const hook = renderHook(() => usePrematchInsightActions(), { wrapper });

    await waitFor(() => {
      expect(
        client.getQueryData(liveKeys.probabilityDelta(FIXTURE_ID))
      ).toBeDefined();
    });

    const generateBefore = hook.result.current.generate;
    const refetchBefore = hook.result.current.refetch;

    client.setQueryData(liveKeys.probabilityDelta(FIXTURE_ID), {
      prematch: { home: 0.4, draw: 0.3, away: 0.3 },
      prematchKind: "PRE_MATCH_PROBABILITY",
      live: { home: 0.6, draw: 0.15, away: 0.25 },
      liveKind: "LIVE_PROBABILITY",
      liveMinute: 60,
      liveAvailable: true,
      unavailableReason: null,
      sourceSnapshot: null,
      prematchPrediction: null,
      livePrediction: null,
    } satisfies LiveProbabilityDeltaResponse);

    hook.rerender();

    expect(hook.result.current.generate).toBe(generateBefore);
    expect(hook.result.current.refetch).toBe(refetchBefore);
  });

  it("view hook receives updated liveDelta", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    createFetchRouter({});

    function ViewProbe() {
      const view = usePrematchInsightView();
      return (
        <span data-testid="live-minute">
          {view.liveDelta?.liveMinute ?? "none"}
        </span>
      );
    }

    render(
      <QueryClientProvider client={client}>
        <AIInsightProvider
          fixtureId={FIXTURE_ID}
          fixtureStatus="FT"
          kickoffAt={KICKOFF_SOON}
          isGuest={false}
        >
          <ViewProbe />
        </AIInsightProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("live-minute").textContent).toBe("55");
    });
  });
});
