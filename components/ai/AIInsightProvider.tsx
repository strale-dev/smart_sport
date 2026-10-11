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
  resolvePrematchDisplayExperience,
  type PrematchDisplayExperience,
} from "@/lib/ai/prematch-availability";
import {
  canBackfillMissingPrematchInsight,
  canGeneratePrematchInsight,
  isFixtureAnalyzable,
  resolveFixturePhase,
} from "@/lib/ai/status-map";
import type { PrematchInsightResponse } from "@/lib/ai/schemas";
import {
  buildAutoEnsureKey,
  recordAutoEnsureOutcome,
  shouldStartAutoEnsure,
  type AutoEnsurePostOutcome,
} from "@/lib/ai/prematch-auto-ensure";
import { parseFixtureReadinessSnapshot } from "@/lib/fixtures/readiness/gates";
import type { FixtureReadinessSnapshot } from "@/lib/fixtures/readiness/types";
import { fetchLiveProbabilityDelta } from "@/lib/live/live-probability-delta";
import { predictionFromDeltaSnapshot } from "@/lib/live/live-insight-display";
import { liveKeys } from "@/lib/live/query-keys";
import { resolveCanonicalPrematchInsightState } from "@/lib/ai/canonical-insight-state";
import {
  describeMatchAiUiState,
  resolveMatchAiUiState,
  type MatchAiUiCopy,
  type MatchAiUiState,
} from "@/lib/ai/match-ai-ui-state";
import type { LiveProbabilityDeltaResponse } from "@/lib/live/live-probability-delta";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";

const AI_READ_STALE_MS = 30_000;
const HISTORICAL_PREMATCH_STALE_MS = 60_000;

type AIInsightProviderProps = {
  fixtureId: number;
  fixtureStatus: string;
  kickoffAt: string;
  isGuest: boolean;
  children: ReactNode;
};

export type AIInsightContextValue = PrematchInsightViewModel & {
  displayExperience: PrematchDisplayExperience;
  generate: () => Promise<void>;
  refetch: () => Promise<void>;
  isGenerating: boolean;
  aiUiState: MatchAiUiState;
  aiUiCopy: MatchAiUiCopy;
  liveDelta: LiveProbabilityDeltaResponse | undefined;
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
  kickoffAt,
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
  const lastLockedEnsureKeyRef = useRef<string | null>(null);
  const lastPostOutcomeRef = useRef<AutoEnsurePostOutcome>(null);
  const ensureInFlightRef = useRef(false);
  const prevShouldAutoGenerateRef = useRef(false);

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

  const readinessQuery = useQuery({
    queryKey: [...liveKeys.all, "fixture-readiness", fixtureId] as const,
    queryFn: async () => {
      const response = await fetch(`/api/fixtures/${fixtureId}/readiness`);
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as {
        readiness?: unknown;
      };
      return parseFixtureReadinessSnapshot(body.readiness);
    },
    enabled: prematchQueryEnabled,
    staleTime: AI_READ_STALE_MS,
    refetchOnWindowFocus: false,
  });

  const readinessSnapshot: FixtureReadinessSnapshot | null =
    readinessQuery.data ?? null;
  const aiGenerationAllowed =
    readinessSnapshot?.gates?.aiGenerationAllowed === true;
  const aiContextReady = readinessSnapshot?.gates?.aiContextReady === true;

  const autoEnsureKey = useMemo(() => {
    const insightData = prematchInsightQuery.data;
    const fingerprintFromInsight =
      insightData?.status === "MISS" || insightData?.status === "OK"
        ? insightData.prediction?.inputSnapshotFingerprint
        : undefined;

    return buildAutoEnsureKey({
      fixtureId,
      predictionFingerprint:
        readinessSnapshot?.artifacts?.prediction?.fingerprint ??
        fingerprintFromInsight,
      contextHash: readinessSnapshot?.artifacts?.aiPrematch?.contextHash,
      aiGenerationAllowed,
      aiContextReady,
    });
  }, [
    aiContextReady,
    aiGenerationAllowed,
    fixtureId,
    prematchInsightQuery.data,
    readinessSnapshot?.artifacts?.aiPrematch?.contextHash,
    readinessSnapshot?.artifacts?.prediction?.fingerprint,
  ]);

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

  const liveDelta = liveDeltaQuery.data;

  const canonicalPrematch = useMemo(() => {
    if (isLivePhase || isGuest || !isAnalyzable) {
      return null;
    }
    return resolveCanonicalPrematchInsightState({
      response: prematchInsightQuery.data ?? null,
      hookState: prematchViewModel.state,
      fixturePhase: prematchViewModel.fixturePhase,
      isGenerating,
      readinessLoading: readinessQuery.isPending,
      aiGenerationAllowed,
      aiContextReady,
    });
  }, [
    aiContextReady,
    aiGenerationAllowed,
    isAnalyzable,
    isGuest,
    isGenerating,
    isLivePhase,
    prematchInsightQuery.data,
    prematchViewModel.fixturePhase,
    prematchViewModel.state,
    readinessQuery.isPending,
  ]);

  const aiUiState = useMemo(
    () =>
      resolveMatchAiUiState({
        fixturePhase: viewModel.fixturePhase,
        hookState: viewModel.state,
        isGuest,
        isGenerating,
        hasInsight: viewModel.insight != null,
        hasPrediction: viewModel.prediction != null,
        hasLiveWinProbabilities: viewModel.liveWinProbabilities != null,
        canonical: canonicalPrematch,
        liveInsightStatus: liveInsightQuery.data?.status ?? null,
        liveAvailable: isLivePhase ? (liveDelta?.liveAvailable ?? null) : null,
        liveUnavailableReason: liveDelta?.unavailableReason ?? null,
        networkErrorMessage: viewModel.errorMessage,
        dailyLimitReached: viewModel.state === "limit",
      }),
    [
      canonicalPrematch,
      isGuest,
      isGenerating,
      isLivePhase,
      liveDelta?.liveAvailable,
      liveDelta?.unavailableReason,
      liveInsightQuery.data?.status,
      viewModel.errorMessage,
      viewModel.fixturePhase,
      viewModel.insight,
      viewModel.liveWinProbabilities,
      viewModel.prediction,
      viewModel.state,
    ]
  );

  const aiUiCopy = useMemo(
    () =>
      describeMatchAiUiState({
        state: aiUiState,
        fixturePhase: viewModel.fixturePhase,
        reasonCode: canonicalPrematch?.reasonCode ?? null,
        liveUnavailableReason: liveDelta?.unavailableReason ?? null,
        hasPrediction: viewModel.prediction != null,
        hasLiveWinProbabilities: viewModel.liveWinProbabilities != null,
        generationFailureMessage: viewModel.generationFailureMessage,
        contextStale: viewModel.contextStale,
        networkErrorMessage: viewModel.errorMessage,
      }),
    [
      aiUiState,
      canonicalPrematch?.reasonCode,
      liveDelta?.unavailableReason,
      viewModel.contextStale,
      viewModel.errorMessage,
      viewModel.fixturePhase,
      viewModel.generationFailureMessage,
      viewModel.liveWinProbabilities,
      viewModel.prediction,
    ]
  );

  const displayExperience = useMemo(
    () =>
      resolvePrematchDisplayExperience({
        kickoffAt,
        fixturePhase: viewModel.fixturePhase,
        hookState: viewModel.state,
        hasInsight: viewModel.insight != null,
        prediction:
          viewModel.prediction?.type === "PREMATCH"
            ? viewModel.prediction
            : null,
      }),
    [
      kickoffAt,
      viewModel.fixturePhase,
      viewModel.insight,
      viewModel.prediction,
      viewModel.state,
    ]
  );

  const canEnsurePrematch =
    canGeneratePrematchInsight(fixtureStatus) ||
    canBackfillMissingPrematchInsight(fixtureStatus);

  const applyPrematchQueryData = useCallback(
    (response: PrematchInsightResponse) => {
      const queryKey =
        resolveFixturePhase(fixtureStatus) === "LIVE"
          ? liveKeys.historicalPrematch(fixtureId)
          : liveKeys.prematchInsight(fixtureId);
      queryClient.setQueryData(queryKey, response);
    },
    [fixtureId, fixtureStatus, queryClient]
  );

  const ensurePrematchInsight = useCallback(
    async (
      prediction: Extract<
        PrematchInsightResponse,
        { status: "MISS" }
      >["prediction"]
    ) => {
      if (
        !shouldStartAutoEnsure({
          inFlight: ensureInFlightRef.current,
          lastLockedKey: lastLockedEnsureKeyRef.current,
          currentKey: autoEnsureKey,
          lastPostOutcome: lastPostOutcomeRef.current,
        })
      ) {
        return;
      }

      ensureInFlightRef.current = true;
      setIsGenerating(true);

      try {
        const response = await fetchPrematchInsightPost(fixtureId);
        lastPostOutcomeRef.current = response.status;
        lastLockedEnsureKeyRef.current = recordAutoEnsureOutcome({
          currentKey: autoEnsureKey,
          postOutcome: response.status,
        });
        applyPrematchQueryData(response);
      } catch (error) {
        lastPostOutcomeRef.current = "NETWORK_ERROR";
        lastLockedEnsureKeyRef.current = recordAutoEnsureOutcome({
          currentKey: autoEnsureKey,
          postOutcome: "NETWORK_ERROR",
        });
        const message =
          error instanceof Error ? error.message : "Failed to generate insight";
        void prematchInsightQuery.refetch();
        if (!prediction) {
          setManualErrorMessage(message);
        }
      } finally {
        setIsGenerating(false);
        ensureInFlightRef.current = false;
      }
    },
    [applyPrematchQueryData, autoEnsureKey, fixtureId, prematchInsightQuery]
  );

  useEffect(() => {
    const prev = prevShouldAutoGenerateRef.current;
    const next = displayExperience.shouldAutoGenerateNarrative;
    prevShouldAutoGenerateRef.current = next;
    if (!prev && next) {
      lastLockedEnsureKeyRef.current = null;
      lastPostOutcomeRef.current = null;
    }
  }, [displayExperience.shouldAutoGenerateNarrative]);

  useEffect(() => {
    if (!prematchQueryEnabled) {
      return;
    }

    const data = prematchInsightQuery.data;
    if (
      !data ||
      data.status !== "MISS" ||
      !canEnsurePrematch ||
      !displayExperience.shouldAutoGenerateNarrative ||
      !aiGenerationAllowed
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void ensurePrematchInsight(data.prediction);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    aiGenerationAllowed,
    canEnsurePrematch,
    displayExperience.shouldAutoGenerateNarrative,
    ensurePrematchInsight,
    prematchInsightQuery.data,
    prematchQueryEnabled,
  ]);

  useEffect(() => {
    if (!prematchQueryEnabled) {
      return;
    }

    const data = prematchInsightQuery.data;
    if (
      !data ||
      data.status !== "OK" ||
      !data.contextStale ||
      !canEnsurePrematch ||
      !displayExperience.shouldAutoGenerateNarrative
    ) {
      return;
    }

    lastLockedEnsureKeyRef.current = null;
    lastPostOutcomeRef.current = null;
    const timer = window.setTimeout(() => {
      void ensurePrematchInsight(data.prediction ?? undefined);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    canEnsurePrematch,
    displayExperience.shouldAutoGenerateNarrative,
    ensurePrematchInsight,
    prematchInsightQuery.data,
    prematchQueryEnabled,
  ]);

  useEffect(() => {
    if (!isLivePhase || isGuest) {
      return;
    }

    const data = historicalPrematchQuery.data;
    if (
      !data ||
      data.status !== "MISS" ||
      !canEnsurePrematch ||
      !displayExperience.shouldAutoGenerateNarrative
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void ensurePrematchInsight(data.prediction);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    canEnsurePrematch,
    displayExperience.shouldAutoGenerateNarrative,
    ensurePrematchInsight,
    historicalPrematchQuery.data,
    isGuest,
    isLivePhase,
  ]);

  const refetch = useCallback(async () => {
    const phaseInitial = resolveInitialPrematchInsightState({
      isGuest,
      fixtureStatus,
    });

    if (phaseInitial === "guest" || phaseInitial === "neither") {
      return;
    }

    lastLockedEnsureKeyRef.current = null;
    lastPostOutcomeRef.current = null;
    setIsGenerating(false);

    if (isLivePhase) {
      const [, historical] = await Promise.all([
        liveInsightQuery.refetch(),
        historicalPrematchQuery.refetch(),
        liveDeltaQuery.refetch(),
      ]);
      if (historical.data?.status === "MISS" && canEnsurePrematch) {
        await ensurePrematchInsight(historical.data.prediction);
      }
      return;
    }

    const result = await prematchInsightQuery.refetch();
    const response = result.data;
    if (response?.status === "MISS" && canEnsurePrematch) {
      await ensurePrematchInsight(response.prediction);
    }
  }, [
    canEnsurePrematch,
    ensurePrematchInsight,
    fixtureStatus,
    isGuest,
    isLivePhase,
    historicalPrematchQuery,
    liveDeltaQuery,
    liveInsightQuery,
    prematchInsightQuery,
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
    if (isGuest || !canEnsurePrematch) {
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
  }, [applyPrematchQueryData, canEnsurePrematch, fixtureId, isGuest]);

  const value = useMemo<AIInsightContextValue>(
    () => ({
      ...viewModel,
      displayExperience,
      generate,
      refetch,
      isGenerating,
      aiUiState,
      aiUiCopy,
      liveDelta,
    }),
    [
      viewModel,
      displayExperience,
      generate,
      refetch,
      isGenerating,
      aiUiState,
      aiUiCopy,
      liveDelta,
    ]
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
