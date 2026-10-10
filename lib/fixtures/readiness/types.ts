export type ReadinessItemState =
  "missing" | "not_yet_available" | "stale" | "insufficient" | "unavailable";

export type FixtureLifecyclePhase =
  | "UPCOMING"
  | "PREMATCH_COLLECTING"
  | "PREDICTION_READY"
  | "AI_READY"
  | "LIVE"
  | "LIVE_UPDATING"
  | "FINISHED"
  | "POSTMATCH_COLLECTING"
  | "HISTORICAL"
  | "NEITHER";

export type LiveSubState = "active" | "paused" | null;

export type ReadinessItemKey =
  | "fixture_metadata"
  | "teams"
  | "standings"
  | "form"
  | "historical_depth"
  | "h2h"
  | "odds"
  | "injuries"
  | "lineups"
  | "events"
  | "statistics"
  | "prediction"
  | "ai_context"
  | "ai_insight"
  | "live_sync"
  | "postmatch_bundle";

export type ReadinessItem = {
  key: ReadinessItemKey;
  state: ReadinessItemState;
  reason?: string;
  asOf?: string;
};

export type FixtureReadinessGates = {
  predictionReady: boolean;
  predictionFresh: boolean;
  aiContextReady: boolean;
  aiGenerationAllowed: boolean;
  liveDataCurrent: boolean;
  historicalDataSufficient: boolean;
};

export type FixtureReadinessArtifacts = {
  prediction?: {
    predictionId: string;
    createdAt: string;
    isOfficial: boolean;
    fingerprint?: string;
    stale: boolean;
  };
  aiPrematch?: {
    insightId?: string;
    contextHash?: string;
    createdAt?: string;
    matchesCurrentInputs: boolean;
    stale: boolean;
  };
  live?: {
    lastProviderSyncAt: string | null;
    stale: boolean;
  };
  historical?: {
    homeTeamState: string;
    awayTeamState: string;
    evaluatedAt: string;
  };
};

export type FixtureReadinessSnapshot = {
  version: 1;
  phase: FixtureLifecyclePhase;
  evaluatedAt: string;
  timezonePolicy: "Europe/Belgrade";
  liveSubState: LiveSubState;
  gates: FixtureReadinessGates;
  artifacts: FixtureReadinessArtifacts;
  items: ReadinessItem[];
};
