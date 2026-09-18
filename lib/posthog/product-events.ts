import { POSTHOG_EVENTS } from "@/lib/posthog/events";

/** PostHog Action name — keep in sync with docs/ANALYTICS-DASHBOARDS.md */
export const POSTHOG_PRODUCT_ACTIVITY_ACTION_NAME = "Product activity";

/**
 * Custom events that count as in-app product activity for DAU / retention.
 * Excludes meta events (cookie consent, waitlist).
 */
export const POSTHOG_PRODUCT_EVENT_NAMES = [
  POSTHOG_EVENTS.landingView,
  POSTHOG_EVENTS.signupCompleted,
  POSTHOG_EVENTS.loginCompleted,
  POSTHOG_EVENTS.matchViewed,
  POSTHOG_EVENTS.matchTabChanged,
  POSTHOG_EVENTS.matchFormScopeChanged,
  POSTHOG_EVENTS.matchH2hScopeChanged,
  POSTHOG_EVENTS.matchMomentumViewed,
  POSTHOG_EVENTS.leagueViewed,
  POSTHOG_EVENTS.teamViewed,
  POSTHOG_EVENTS.playerViewed,
  POSTHOG_EVENTS.aiGenerateClicked,
  POSTHOG_EVENTS.aiLimitReached,
  POSTHOG_EVENTS.aiInsightGenerated,
  POSTHOG_EVENTS.aiLiveInsightViewed,
  POSTHOG_EVENTS.matchScoreFlipped,
  POSTHOG_EVENTS.liveMeaningfulEventReceived,
  POSTHOG_EVENTS.liveCenterAiUpdatedMarkerRendered,
  POSTHOG_EVENTS.followAdded,
  POSTHOG_EVENTS.followRemoved,
  POSTHOG_EVENTS.favoriteAdded,
  POSTHOG_EVENTS.favoriteRemoved,
  POSTHOG_EVENTS.trialStarted,
  POSTHOG_EVENTS.trialConverted,
  POSTHOG_EVENTS.subscriptionCancelled,
  POSTHOG_EVENTS.predictionsCenterViewed,
] as const;

export type PostHogProductEventName =
  (typeof POSTHOG_PRODUCT_EVENT_NAMES)[number];
