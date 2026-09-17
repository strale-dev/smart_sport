import type { NotificationKind } from "@/lib/notifications/dedupe";

export type NotificationFixtureTeams = {
  homeName: string;
  awayName: string;
  fixtureProviderId: number;
};

export type NotificationCopy = {
  title: string;
  body: string | null;
};

export function buildNotificationCopy(
  kind: NotificationKind,
  teams: NotificationFixtureTeams,
  options?: {
    scoringTeamName?: string | null;
    minute?: number | null;
  }
): NotificationCopy {
  const matchLabel = `${teams.homeName} vs ${teams.awayName}`;

  switch (kind) {
    case "GOAL_FOR_FOLLOWED_TEAM": {
      const scorer = options?.scoringTeamName?.trim();
      const minute = options?.minute != null ? `${options.minute}'` : null;
      const bodyParts = [scorer ? `Goal for ${scorer}` : "Goal scored", minute]
        .filter(Boolean)
        .join(" · ");
      return {
        title: `Goal — ${matchLabel}`,
        body: bodyParts || null,
      };
    }
    case "FULL_TIME_FOLLOWED_TEAM":
      return {
        title: `Full time — ${matchLabel}`,
        body: "The match has ended.",
      };
    case "LINEUP_CONFIRMED":
      return {
        title: `Lineups confirmed — ${matchLabel}`,
        body: "Starting lineups are available.",
      };
    case "PREDICTION_SHIFT":
      return {
        title: `Prediction update — ${matchLabel}`,
        body: "Win probabilities shifted significantly.",
      };
    case "AI_INSIGHT_REFRESHED":
      return {
        title: `AI insight updated — ${matchLabel}`,
        body: "Live analysis was refreshed.",
      };
    case "TRIAL_ENDING":
      return {
        title: "Your trial is ending soon",
        body: "Review your subscription before the trial ends.",
      };
    case "PAYMENT_SUCCESS":
      return {
        title: "Payment received",
        body: "Your Premium subscription is active.",
      };
    case "PAYMENT_FAILED":
      return {
        title: "Payment failed",
        body: "Update your billing details to keep Premium access.",
      };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function fixtureLinkPayload(
  fixtureProviderId: number,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { fixtureProviderId, ...extra };
}
