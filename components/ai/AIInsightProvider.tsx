"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
import { canGeneratePrematchInsight } from "@/lib/ai/status-map";
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
  const [viewModel, setViewModel] = useState<PrematchInsightViewModel>(() =>
    createInitialViewModel(fixtureStatus, isGuest)
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const shouldFetchOnMount = viewModel.state === "loading";

  const applyResponse = useCallback(
    (response: Parameters<typeof mapPrematchInsightResponseToViewModel>[0]) => {
      setViewModel(
        mapPrematchInsightResponseToViewModel(response, fixtureStatus)
      );
    },
    [fixtureStatus]
  );

  const refetch = useCallback(async () => {
    const phaseInitial = resolveInitialPrematchInsightState({
      isGuest,
      fixtureStatus,
    });

    if (phaseInitial === "guest") {
      setViewModel(createInitialViewModel(fixtureStatus, true));
      return;
    }

    if (phaseInitial === "neither") {
      setViewModel(createInitialViewModel(fixtureStatus, false));
      return;
    }

    setViewModel((current) => ({
      ...current,
      state: "loading",
      errorMessage: null,
    }));

    try {
      const response = await fetchPrematchInsightGet(fixtureId);
      applyResponse(response);
    } catch (error) {
      setViewModel({
        ...createEmptyPrematchInsightViewModel(fixtureStatus),
        state: "error",
        errorMessage:
          error instanceof Error ? error.message : "Failed to load AI insight",
      });
    }
  }, [applyResponse, fixtureId, fixtureStatus, isGuest]);

  useEffect(() => {
    if (!shouldFetchOnMount) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetchPrematchInsightGet(fixtureId);
        if (!cancelled) {
          applyResponse(response);
        }
      } catch (error) {
        if (!cancelled) {
          setViewModel({
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
  }, [applyResponse, fixtureId, fixtureStatus, shouldFetchOnMount]);

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
      applyResponse(response);

      if (response.status === "AI_LIMIT_REACHED") {
        void captureClientEvent(POSTHOG_EVENTS.aiLimitReached, {
          fixture_id: fixtureId,
          limit: response.limit,
          used: response.used,
        });
      }
    } catch (error) {
      setViewModel({
        ...createEmptyPrematchInsightViewModel(fixtureStatus),
        state: "error",
        errorMessage:
          error instanceof Error ? error.message : "Failed to generate insight",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [applyResponse, fixtureId, fixtureStatus, isGuest]);

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
