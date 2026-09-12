"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { fetchLiveInsight } from "@/lib/ai/live-insight-fetch";
import { mapLiveInsightResponseToViewModel } from "@/lib/ai/live-insight-state";
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
  resolveFixturePhase,
} from "@/lib/ai/status-map";
import { liveKeys } from "@/lib/live/query-keys";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";

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
  const fixturePhase = resolveFixturePhase(fixtureStatus);
  const isLivePhase = fixturePhase === "LIVE";

  const [prematchViewModel, setPrematchViewModel] =
    useState<PrematchInsightViewModel>(() =>
      createInitialViewModel(fixtureStatus, isGuest)
    );
  const [isGenerating, setIsGenerating] = useState(false);

  const liveInsightQuery = useQuery({
    queryKey: liveKeys.liveInsight(fixtureId),
    queryFn: () => fetchLiveInsight(fixtureId),
    enabled: !isGuest && isLivePhase,
  });

  const liveViewModel = useMemo((): PrematchInsightViewModel | null => {
    if (!isLivePhase || isGuest) {
      return null;
    }

    if (liveInsightQuery.isLoading && !liveInsightQuery.data) {
      return {
        ...createEmptyPrematchInsightViewModel(fixtureStatus),
        state: "loading",
      };
    }

    if (liveInsightQuery.isError) {
      return {
        ...createEmptyPrematchInsightViewModel(fixtureStatus),
        state: "error",
        errorMessage:
          liveInsightQuery.error instanceof Error
            ? liveInsightQuery.error.message
            : "Failed to load live AI insight",
      };
    }

    if (liveInsightQuery.data) {
      const mapped = mapLiveInsightResponseToViewModel(
        liveInsightQuery.data,
        fixtureStatus
      );
      return {
        ...createEmptyPrematchInsightViewModel(fixtureStatus),
        ...mapped,
        prediction: null,
        limit: null,
        used: null,
        fallbackMessage: null,
      };
    }

    return null;
  }, [
    fixtureStatus,
    isGuest,
    isLivePhase,
    liveInsightQuery.data,
    liveInsightQuery.error,
    liveInsightQuery.isError,
    liveInsightQuery.isLoading,
  ]);

  const viewModel = liveViewModel ?? prematchViewModel;

  const applyPrematchResponse = useCallback(
    (response: Parameters<typeof mapPrematchInsightResponseToViewModel>[0]) => {
      setPrematchViewModel(
        mapPrematchInsightResponseToViewModel(response, fixtureStatus)
      );
    },
    [fixtureStatus]
  );

  const shouldFetchPrematchOnMount =
    prematchViewModel.state === "loading" && !isLivePhase && !isGuest;

  const refetch = useCallback(async () => {
    const phaseInitial = resolveInitialPrematchInsightState({
      isGuest,
      fixtureStatus,
    });

    if (phaseInitial === "guest") {
      setPrematchViewModel(createInitialViewModel(fixtureStatus, true));
      return;
    }

    if (phaseInitial === "neither") {
      setPrematchViewModel(createInitialViewModel(fixtureStatus, false));
      return;
    }

    if (isLivePhase) {
      await liveInsightQuery.refetch();
      return;
    }

    setPrematchViewModel((current) => ({
      ...current,
      state: "loading",
      errorMessage: null,
    }));

    try {
      const response = await fetchPrematchInsightGet(fixtureId);
      applyPrematchResponse(response);
    } catch (error) {
      setPrematchViewModel({
        ...createEmptyPrematchInsightViewModel(fixtureStatus),
        state: "error",
        errorMessage:
          error instanceof Error ? error.message : "Failed to load AI insight",
      });
    }
  }, [
    applyPrematchResponse,
    fixtureId,
    fixtureStatus,
    isGuest,
    isLivePhase,
    liveInsightQuery,
  ]);

  useEffect(() => {
    if (!shouldFetchPrematchOnMount) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetchPrematchInsightGet(fixtureId);
        if (!cancelled) {
          applyPrematchResponse(response);
        }
      } catch (error) {
        if (!cancelled) {
          setPrematchViewModel({
            ...createEmptyPrematchInsightViewModel(fixtureStatus),
            state: "error",
            errorMessage:
              error instanceof Error
                ? error.message
                : "Failed to load AI insight",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    applyPrematchResponse,
    fixtureId,
    fixtureStatus,
    shouldFetchPrematchOnMount,
  ]);

  const generate = useCallback(async () => {
    if (isGuest || !canGeneratePrematchInsight(fixtureStatus)) {
      return;
    }

    setIsGenerating(true);
    void captureClientEvent(POSTHOG_EVENTS.aiGenerateClicked, {
      fixture_id: fixtureId,
    });

    try {
      const response = await fetchPrematchInsightPost(fixtureId);
      applyPrematchResponse(response);

      if (response.status === "AI_LIMIT_REACHED") {
        void captureClientEvent(POSTHOG_EVENTS.aiLimitReached, {
          fixture_id: fixtureId,
          limit: response.limit,
          used: response.used,
        });
      }
    } catch (error) {
      setPrematchViewModel({
        ...createEmptyPrematchInsightViewModel(fixtureStatus),
        state: "error",
        errorMessage:
          error instanceof Error ? error.message : "Failed to generate insight",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [applyPrematchResponse, fixtureId, fixtureStatus, isGuest]);

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
