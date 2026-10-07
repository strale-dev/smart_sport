export type {
  FixtureLifecyclePhase,
  FixtureReadinessArtifacts,
  FixtureReadinessGates,
  FixtureReadinessSnapshot,
  LiveSubState,
  ReadinessItem,
  ReadinessItemKey,
  ReadinessItemState,
} from "./types";

export {
  IMMINENT_BEFORE_KICKOFF_MS,
  LIFECYCLE_TIMEZONE,
  PREMATCH_FRESHNESS_MS,
  PREMATCH_LLM_ACTIVE_MS,
  PREMATCH_SCHEDULED_LEAD_MS,
  getLifecycleTodayDateKey,
} from "./constants";

export {
  isImminentBelgrade,
  isKickoffReached,
  isKickoffTodayBelgrade,
  isUpcomingBeyondScheduleWindow,
  msUntilKickoff,
  resolveLifecyclePhase,
  resolveLiveSubState,
} from "./lifecycle";

export {
  buildReadinessItems,
  computeReadinessGates,
  evaluateFixtureReadiness,
  type FixtureEvaluationInput,
} from "./evaluate";

export {
  gatesFromSnapshot,
  isAiContextReady,
  isAiGenerationAllowed,
  isFixtureReadyForPrediction,
  isHistoricalDataSufficient,
  isLiveDataCurrent,
  isPredictionFresh,
  listReadinessItems,
  parseFixtureReadinessSnapshot,
} from "./gates";

export {
  evaluateAndPersistFixtureReadiness,
  evaluateFixtureReadinessForProvider,
  readPersistedFixtureReadiness,
  refreshReadinessBatch,
  refreshReadinessForKickoffWindow,
} from "./persist";
