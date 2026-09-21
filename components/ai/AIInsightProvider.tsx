"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { fetchLiveInsight } from "@/lib/ai/live-insight-fetch";
import { resolveLivePhaseViewModel } from "@/lib/ai/live-insight-state";
import {
  fetchPrematchInsightGet,
  fetchPrematchInsightPost,
} from "@/lib/ai/prematch-insight-fetch";
import {
  createEmptyPrematchInsightViewModel,
  mapPrematchInsightResponseToViewModel,
  resolveInitialPrematchInsightState,
  type PrematchInsightViewModel,
} from "@/lib/ai/prematch-insight-state";
import {
  canGeneratePrematchInsight,
  isFixtureAnalyzable,
  resolveFixturePhase,
} from "@/lib/ai/status-map";
import { fetchLiveProbabilityDelta } from "@/lib/live/live-probability-delta";
import { predictionFromDeltaSnapshot } from "@/lib/live/live-insight-display";
import { liveKeys } from "@/lib/live/query-keys";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";

const AI_READ_STALE_MS = 30_000;
const HISTORICAL_PREMATCH_STALE_MS = 60_000;

type AIInsightProviderProps = {
  fixtureId: number;
  fixtureStatus: string;
  isGuest: boolean;
  children: ReactNode;
};

type AIInsightContextValue = PrematchInsightViewModel & {
  generate: () => Promise<void>;
  refetch: () => Promise<void>;
  isGenerating: boolean;
};

const AIInsightContext = createContext<AIInsightContextValue | null>(null);

function createInitialViewModel(
  fixtureStatus: string,
  isGuest: boolean
): PrematchInsightViewModel {
  const initialState = resolveInitialPrematchInsightState({
    isGuest,
    fixtureStatus,
  });

  return {
    ...createEmptyPrematchInsightViewModel(fixtureStatus),
    state: initialState,
  };
}

export function AIInsightProvider({
  fixtureId,
  fixtureStatus,
  isGuest,
  children,
}: AIInsightProviderProps) {
  const queryClient = useQueryClient();
  const fixturePhase = resolveFixturePhase(fixtureStatus);
  const isLivePhase = fixturePhase === "LIVE";
  const isAnalyzable = isFixtureAnalyzable(fixtureStatus);
  const prematchQueryEnabled = !isGuest && !isLivePhase && isAnalyzable;

  const [isGenerating, setIsGenerating] = useState(false);
  const [manualErrorMessage, setManualErrorMessage] = useState<string | null>(
    null
  );
  const ensureAttemptedRef = useRef(false);
  const ensureInFlightRef = useRef(false);

  const liveInsightQuery = useQuery({
    queryKey: liveKeys.liveInsight(fixtureId),
    queryFn: () => fetchLiveInsight(fixtureId),
    enabled: !isGuest && isLivePhase,
    staleTime: AI_READ_STALE_MS,
    refetchOnWindowFocus: false,
  });

  const historicalPrematchQuery = useQuery({
    queryKey: liveKeys.historicalPrematch(fixtureId),
    queryFn: () => fetchPrematchInsightGet(fixtureId),
    enabled: !isGuest && isLivePhase,
    staleTime: HISTORICAL_PREMATCH_STALE_MS,
    refetchOnWindowFocus: false,
  });

  const liveDeltaQuery = useQuery({
    queryKey: liveKeys.probabilityDelta(fixtureId),
    queryFn: () => fetchLiveProbabilityDelta(fixtureId),
    enabled: isLivePhase,
    staleTime: AI_READ_STALE_MS,
    refetchOnWindowFocus: false,
  });

  const prematchInsightQuery = useQuery({
    queryKey: liveKeys.prematchInsight(fixtureId),
    queryFn: () => fetchPrematchInsightGet(fixtureId),
    enabled: prematchQueryEnabled,
    staleTime: AI_READ_STALE_MS,
    refetchOnWindowFocus: false,
  });

  const liveViewModel = useMemo((): PrematchInsightViewModel | null => {
    if (!isLivePhase) {
      return null;
    }

    if (isGuest) {
      const delta = liveDeltaQuery.data;
      return {
        ...createEmptyPrematchInsightViewModel(fixtureStatus),
        state: "guest",
        prediction: delta?.prematchPrediction
          ? predictionFromDeltaSnapshot(fixtureId, delta.prematchPrediction)
          : null,
        liveWinProbabilities: delta?.live ?? null,
      };
    }

    return resolveLivePhaseViewModel({
      fixtureId,
      fixtureStatus,
      liveInsightData: liveInsightQuery.data,
      liveInsightError:
        liveInsightQuery.error instanceof Error
          ? liveInsightQuery.error
          : liveInsightQuery.error
            ? new Error("Failed to load live AI insight")
            : null,
      liveInsightPending: liveInsightQuery.isPending,
      historicalPrematchData: historicalPrematchQuery.data,
      historicalPrematchPending: historicalPrematchQuery.isPending,
      liveDelta: liveDeltaQuery.data,
    });
  }, [
    fixtureId,
    fixtureStatus,
    historicalPrematchQuery.data,
    historicalPrematchQuery.isPending,
    isGuest,
    isLivePhase,
    liveDeltaQuery.data,
    liveInsightQuery.data,
    liveInsightQuery.error,
    liveInsightQuery.isPending,
  ]);

  const prematchViewModel = useMemo((): PrematchInsightViewModel => {
    if (isLivePhase) {
      return createInitialViewModel(fixtureStatus, isGuest);
    }

    if (isGuest || !isAnalyzable) {
      return createInitialViewModel(fixtureStatus, isGuest);
    }

    if (prematchInsightQuery.isPending && !prematchInsightQuery.data) {
      return {
        ...createEmptyPrematchInsightViewModel(fixtureStatus),
        state: "loading",
      };
    }

    if (manualErrorMessage) {
      return {
        ...createEmptyPrematchInsightViewModel(fixtureStatus),
        state: "error",
        errorMessage: manualErrorMessage,
      };
    }

    if (prematchInsightQuery.isError) {
      return {
        ...createEmptyPrematchInsightViewModel(fixtureStatus),
        state: "error",
        errorMessage:
          prematchInsightQuery.error instanceof Error
            ? prematchInsightQuery.error.message
            : "Failed to load AI insight",
      };
    }

    if (prematchInsightQuery.data) {
      return mapPrematchInsightResponseToViewModel(
        prematchInsightQuery.data,
        fixtureStatus
      );
    }

    return {
      ...createEmptyPrematchInsightViewModel(fixtureStatus),
      state: "loading",
    };
  }, [
    fixtureStatus,
    isAnalyzable,
    isGuest,
    isLivePhase,
    prematchInsightQuery.data,
    prematchInsightQuery.error,
    prematchInsightQuery.isError,
    prematchInsightQuery.isPending,
    manualErrorMessage,
  ]);

  const viewModel = liveViewModel ?? prematchViewModel;

  const applyPrematchQueryData = useCallback(
    (response: Parameters<typeof mapPrematchInsightResponseToViewModel>[0]) => {
      queryClient.setQueryData(liveKeys.prematchInsight(fixtureId), response);
    },
    [fixtureId, queryClient]
  );

  useEffect(() => {
    if (!prematchQueryEnabled) {
      return;
    }

    const data = prematchInsightQuery.data;
    if (!data || data.status !== "MISS") {
      return;
    }

    if (!canGeneratePrematchInsight(fixtureStatus)) {
      return;
    }

    if (ensureAttemptedRef.current || ensureInFlightRef.current) {
      return;
    }

    ensureAttemptedRef.current = true;
    ensureInFlightRef.current = true;
    setIsGenerating(true);

    void (async () => {
      try {
        const response = await fetchPrematchInsightPost(fixtureId);
        applyPrematchQueryData(response);
      } catch (error) {
        if (data.prediction) {
          queryClient.setQueryData(liveKeys.prematchInsight(fixtureId), {
            status: "FALLBACK",
            fixtureExternalId: fixtureId,
            prediction: data.prediction,
            message:
              error instanceof Error
                ? error.message
                : "Failed to generate insight",
          });
        } else {
          setManualErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to generate insight"
          );
        }
      } finally {
        setIsGenerating(false);
        ensureInFlightRef.current = false;
      }
    })();
  }, [
    applyPrematchQueryData,
    fixtureId,
    fixtureStatus,
    prematchInsightQuery.data,
    prematchQueryEnabled,
    queryClient,
  ]);

  const refetch = useCallback(async () => {
    const phaseInitial = resolveInitialPrematchInsightState({
      isGuest,
      fixtureStatus,
    });

    if (phaseInitial === "guest" || phaseInitial === "neither") {
      return;
    }

    if (isLivePhase) {
      await Promise.all([
        liveInsightQuery.refetch(),
        historicalPrematchQuery.refetch(),
        liveDeltaQuery.refetch(),
      ]);
      return;
    }

    ensureAttemptedRef.current = false;
    setIsGenerating(false);

    const result = await prematchInsightQuery.refetch();
    const response = result.data;
    if (
      response?.status === "MISS" &&
      canGeneratePrematchInsight(fixtureStatus) &&
      !ensureInFlightRef.current
    ) {
      ensureAttemptedRef.current = true;
      ensureInFlightRef.current = true;
      setIsGenerating(true);
      try {
        const ensured = await fetchPrematchInsightPost(fixtureId);
        applyPrematchQueryData(ensured);
      } catch (error) {
        if (response.prediction) {
          queryClient.setQueryData(liveKeys.prematchInsight(fixtureId), {
            status: "FALLBACK",
            fixtureExternalId: fixtureId,
            prediction: response.prediction,
            message:
              error instanceof Error
                ? error.message
                : "Failed to load AI insight",
          });
        } else {
          setManualErrorMessage(
            error instanceof Error ? error.message : "Failed to load AI insight"
          );
        }
      } finally {
        setIsGenerating(false);
        ensureInFlightRef.current = false;
      }
    }
  }, [
    applyPrematchQueryData,
    fixtureId,
    fixtureStatus,
    isGuest,
    isLivePhase,
    historicalPrematchQuery,
    liveDeltaQuery,
    liveInsightQuery,
    prematchInsightQuery,
    queryClient,
  ]);

  useEffect(() => {
    if (!isLivePhase || isGuest) {
      return;
    }

    if (liveViewModel?.state !== "miss") {
      return;
    }

    void captureClientEvent(POSTHOG_EVENTS.aiLiveInsightUnavailable, {
      fixture_id: fixtureId,
      reason: "no_live_or_prematch_narrative",
    });
  }, [fixtureId, isGuest, isLivePhase, liveViewModel?.state]);

  const generate = useCallback(async () => {
    if (isGuest || !canGeneratePrematchInsight(fixtureStatus)) {
      return;
    }

    setIsGenerating(true);
    void captureClientEvent(POSTHOG_EVENTS.aiGenerateClicked, {
      fixture_id: fixtureId,
    });

    try {
      setManualErrorMessage(null);
      const response = await fetchPrematchInsightPost(fixtureId);
      applyPrematchQueryData(response);

      if (response.status === "AI_LIMIT_REACHED") {
        void captureClientEvent(POSTHOG_EVENTS.aiLimitReached, {
          fixture_id: fixtureId,
          limit: response.limit,
          used: response.used,
        });
      }
    } catch (error) {
      setManualErrorMessage(
        error instanceof Error ? error.message : "Failed to generate insight"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [applyPrematchQueryData, fixtureId, fixtureStatus, isGuest]);

  const value = useMemo<AIInsightContextValue>(
    () => ({
      ...viewModel,
      generate,
      refetch,
      isGenerating,
    }),
    [viewModel, generate, refetch, isGenerating]
  );

  return (
    <AIInsightContext.Provider value={value}>
      {children}
    </AIInsightContext.Provider>
  );
}

export function usePrematchInsight(): AIInsightContextValue {
  const context = useContext(AIInsightContext);
  if (!context) {
    throw new Error("usePrematchInsight must be used within AIInsightProvider");
  }

  return context;
}
