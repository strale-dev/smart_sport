import { hasMinimumModelSignal } from "@/lib/ai/prematch-availability";
import {
  evaluateTeamHistoryDataState,
  type TeamHistoryDataState,
} from "@/lib/analytics/team-history-query";
import { computePrematchFeatureFingerprint } from "@/lib/models/prematch-feature-fingerprint";
import { isProviderSyncStale } from "@/lib/live/live-presentation";
import {
  isFinishedFixtureStatus,
  isLiveFixtureStatus,
  isPrematchFixtureStatus,
} from "@/lib/fixtures/live-status";
import type { PrematchFeatureVector } from "@/types/prediction";

import {
  LINEUP_PUBLISH_LEAD_MS,
  PREMATCH_FRESHNESS_MS,
  PREMATCH_LLM_ACTIVE_MS,
  PREMATCH_SCHEDULED_LEAD_MS,
} from "./constants";
import {
  isKickoffReached,
  msUntilKickoff,
  resolveLifecyclePhase,
  resolveLiveSubState,
} from "./lifecycle";
import type {
  FixtureReadinessArtifacts,
  FixtureReadinessGates,
  FixtureReadinessSnapshot,
  ReadinessItem,
  ReadinessItemKey,
} from "./types";

export type FixtureEvaluationInput = {
  fixtureUuid: string;
  providerId: number;
  status: string;
  kickoffAt: string;
  lastProviderSyncAt: string | null;
  nowMs?: number;
  features: PrematchFeatureVector | null;
  homeHistoryCount: number;
  awayHistoryCount: number;
  lineupsCount: number;
  sidelinedCount: number;
  eventsCount: number;
  statisticsCount: number;
  postmatchDepsComplete: boolean;
  prediction: {
    id: string;
    createdAt: string;
    inputSnapshot: PrematchFeatureVector;
  } | null;
  prematchInsight: {
    id: string;
    contextHash: string;
    createdAt: string;
  } | null;
  currentContextHash: string | null;
};

function item(
  key: ReadinessItemKey,
  state: ReadinessItem["state"],
  reason?: string,
  asOf?: string
): ReadinessItem {
  return { key, state, reason, asOf };
}

function historyStateForCount(count: number): TeamHistoryDataState {
  return evaluateTeamHistoryDataState(count);
}

function isPredictionOfficial(
  predictionCreatedAt: string,
  kickoffAt: string
): boolean {
  return (
    new Date(predictionCreatedAt).getTime() < new Date(kickoffAt).getTime()
  );
}

function isPredictionFresh(
  createdAt: string,
  nowMs: number,
  features: PrematchFeatureVector | null,
  storedSnapshot: PrematchFeatureVector | null
): boolean {
  if (nowMs - new Date(createdAt).getTime() >= PREMATCH_FRESHNESS_MS) {
    return false;
  }
  if (!features || !storedSnapshot) {
    return false;
  }
  return (
    computePrematchFeatureFingerprint(features) ===
    computePrematchFeatureFingerprint(storedSnapshot)
  );
}

export function buildReadinessItems(
  input: FixtureEvaluationInput
): ReadinessItem[] {
  const nowMs = input.nowMs ?? Date.now();
  const untilKickoff = msUntilKickoff(input.kickoffAt, nowMs);
  const prematch = isPrematchFixtureStatus(input.status);
  const live = isLiveFixtureStatus(input.status);
  const finished = isFinishedFixtureStatus(input.status);

  const items: ReadinessItem[] = [
    item("fixture_metadata", "not_yet_available", undefined, input.kickoffAt),
    item("teams", input.fixtureUuid ? "not_yet_available" : "missing"),
    item("odds", "unavailable", "not_in_product"),
  ];

  const homeHist = historyStateForCount(input.homeHistoryCount);
  const awayHist = historyStateForCount(input.awayHistoryCount);
  const histWorst =
    homeHist === "DATA_INSUFFICIENT" || awayHist === "DATA_INSUFFICIENT"
      ? "insufficient"
      : homeHist === "DATA_PARTIAL" || awayHist === "DATA_PARTIAL"
        ? "insufficient"
        : "not_yet_available";

  if (prematch && untilKickoff > PREMATCH_SCHEDULED_LEAD_MS) {
    items.push(item("historical_depth", "not_yet_available"));
  } else if (histWorst === "insufficient") {
    items.push(item("historical_depth", "insufficient", homeHist));
  } else {
    items.push(item("historical_depth", "not_yet_available"));
  }

  if (!input.features) {
    items.push(item("form", prematch ? "missing" : "not_yet_available"));
  } else if (!hasMinimumModelSignal(input.features)) {
    items.push(item("form", "insufficient", "minimum_model_signal"));
  } else {
    items.push(item("form", "not_yet_available"));
  }

  if (untilKickoff > LINEUP_PUBLISH_LEAD_MS && prematch) {
    items.push(item("lineups", "not_yet_available"));
  } else if (input.lineupsCount === 0 && prematch) {
    items.push(item("lineups", "missing"));
  } else if (input.lineupsCount === 0) {
    items.push(item("lineups", "not_yet_available"));
  } else {
    items.push(item("lineups", "not_yet_available"));
  }

  items.push(
    item(
      "injuries",
      input.sidelinedCount > 0 ? "not_yet_available" : "not_yet_available"
    )
  );

  if (prematch) {
    items.push(item("events", "not_yet_available"));
    items.push(item("statistics", "not_yet_available"));
  } else if (live) {
    items.push(
      item("events", input.eventsCount > 0 ? "not_yet_available" : "missing")
    );
    items.push(
      item(
        "statistics",
        input.statisticsCount > 0 ? "not_yet_available" : "missing"
      )
    );
  } else if (finished) {
    items.push(
      item("events", input.eventsCount > 0 ? "not_yet_available" : "missing")
    );
    items.push(
      item(
        "statistics",
        input.statisticsCount > 0 ? "not_yet_available" : "missing"
      )
    );
  }

  if (!input.prediction) {
    items.push(
      item(
        "prediction",
        prematch && !isKickoffReached(input.kickoffAt, nowMs)
          ? "not_yet_available"
          : "missing"
      )
    );
  } else {
    const official = isPredictionOfficial(
      input.prediction.createdAt,
      input.kickoffAt
    );
    const fresh = isPredictionFresh(
      input.prediction.createdAt,
      nowMs,
      input.features,
      input.prediction.inputSnapshot
    );
    if (isKickoffReached(input.kickoffAt, nowMs) && !official) {
      items.push(item("prediction", "stale", "post_kickoff_unofficial"));
    } else if (!fresh && prematch) {
      items.push(item("prediction", "stale", "freshness_or_fingerprint"));
    } else {
      items.push(item("prediction", "not_yet_available"));
    }
  }

  if (!input.features || !hasMinimumModelSignal(input.features)) {
    items.push(item("ai_context", "insufficient", "features_or_signal"));
  } else if (
    homeHist === "DATA_INSUFFICIENT" ||
    awayHist === "DATA_INSUFFICIENT"
  ) {
    items.push(item("ai_context", "insufficient", "history_depth"));
  } else {
    items.push(item("ai_context", "not_yet_available"));
  }

  if (!input.prematchInsight) {
    items.push(item("ai_insight", "not_yet_available"));
  } else if (
    input.currentContextHash &&
    input.prematchInsight.contextHash !== input.currentContextHash
  ) {
    items.push(item("ai_insight", "stale", "context_hash_mismatch"));
  } else {
    items.push(item("ai_insight", "not_yet_available"));
  }

  if (live) {
    const stale = isProviderSyncStale(input.lastProviderSyncAt, nowMs);
    items.push(
      item(
        "live_sync",
        stale ? "stale" : "not_yet_available",
        undefined,
        input.lastProviderSyncAt ?? undefined
      )
    );
  }

  if (finished) {
    items.push(
      item(
        "postmatch_bundle",
        input.postmatchDepsComplete ? "not_yet_available" : "insufficient"
      )
    );
  }

  return items;
}

export function computeReadinessGates(
  input: FixtureEvaluationInput
): FixtureReadinessGates {
  const nowMs = input.nowMs ?? Date.now();
  const prematch = isPrematchFixtureStatus(input.status);
  const live = isLiveFixtureStatus(input.status);
  const untilKickoff = msUntilKickoff(input.kickoffAt, nowMs);

  const featuresOk =
    input.features != null && hasMinimumModelSignal(input.features);

  const inComputeWindow =
    prematch &&
    !isKickoffReached(input.kickoffAt, nowMs) &&
    untilKickoff <= PREMATCH_SCHEDULED_LEAD_MS;

  const predictionFresh =
    input.prediction != null &&
    isPredictionFresh(
      input.prediction.createdAt,
      nowMs,
      input.features,
      input.prediction.inputSnapshot
    );

  const homeHist = historyStateForCount(input.homeHistoryCount);
  const awayHist = historyStateForCount(input.awayHistoryCount);

  const predictionReady =
    featuresOk && inComputeWindow && !isKickoffReached(input.kickoffAt, nowMs);

  const aiContextReady =
    featuresOk &&
    homeHist !== "DATA_INSUFFICIENT" &&
    awayHist !== "DATA_INSUFFICIENT";

  const insightMatches =
    input.prematchInsight != null &&
    input.currentContextHash != null &&
    input.prematchInsight.contextHash === input.currentContextHash;

  const inLlmWindow =
    untilKickoff <= PREMATCH_LLM_ACTIVE_MS && untilKickoff > 0;

  const aiGenerationAllowed =
    prematch &&
    featuresOk &&
    inComputeWindow &&
    predictionFresh &&
    aiContextReady &&
    inLlmWindow &&
    (!input.prematchInsight || !insightMatches);

  const liveDataCurrent =
    live && !isProviderSyncStale(input.lastProviderSyncAt, nowMs);

  const historicalDataSufficient =
    homeHist !== "DATA_INSUFFICIENT" && awayHist !== "DATA_INSUFFICIENT";

  return {
    predictionReady,
    predictionFresh,
    aiContextReady,
    aiGenerationAllowed,
    liveDataCurrent,
    historicalDataSufficient,
  };
}

export function evaluateFixtureReadiness(
  input: FixtureEvaluationInput
): FixtureReadinessSnapshot {
  const nowMs = input.nowMs ?? Date.now();
  const evaluatedAt = new Date(nowMs).toISOString();
  const gates = computeReadinessGates(input);
  const items = buildReadinessItems(input);

  const insightMatches =
    input.prematchInsight != null &&
    input.currentContextHash != null &&
    input.prematchInsight.contextHash === input.currentContextHash;

  const artifacts: FixtureReadinessArtifacts = {};

  if (input.prediction) {
    artifacts.prediction = {
      predictionId: input.prediction.id,
      createdAt: input.prediction.createdAt,
      isOfficial: isPredictionOfficial(
        input.prediction.createdAt,
        input.kickoffAt
      ),
      fingerprint: input.features
        ? computePrematchFeatureFingerprint(input.features)
        : undefined,
      stale: items.some((i) => i.key === "prediction" && i.state === "stale"),
    };
  }

  if (input.prematchInsight) {
    artifacts.aiPrematch = {
      insightId: input.prematchInsight.id,
      contextHash: input.prematchInsight.contextHash,
      createdAt: input.prematchInsight.createdAt,
      matchesCurrentInputs: insightMatches,
      stale: !insightMatches,
    };
  }

  if (isLiveFixtureStatus(input.status)) {
    artifacts.live = {
      lastProviderSyncAt: input.lastProviderSyncAt,
      stale: isProviderSyncStale(input.lastProviderSyncAt, nowMs),
    };
  }

  artifacts.historical = {
    homeTeamState: historyStateForCount(input.homeHistoryCount),
    awayTeamState: historyStateForCount(input.awayHistoryCount),
    evaluatedAt,
  };

  const aiReady = Boolean(
    input.prematchInsight && insightMatches && gates.aiContextReady
  );

  const phasePredictionReady =
    input.prediction != null &&
    (gates.predictionFresh ||
      (isKickoffReached(input.kickoffAt, nowMs) &&
        isPredictionOfficial(input.prediction.createdAt, input.kickoffAt)));

  const phase = resolveLifecyclePhase({
    status: input.status,
    kickoffAt: input.kickoffAt,
    nowMs,
    predictionReady: phasePredictionReady,
    aiReady,
    postmatchComplete: input.postmatchDepsComplete,
  });

  return {
    version: 1,
    phase,
    evaluatedAt,
    timezonePolicy: "Europe/Belgrade",
    liveSubState: resolveLiveSubState(input.status),
    gates,
    artifacts,
    items,
  };
}
