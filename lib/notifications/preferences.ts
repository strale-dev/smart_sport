import type { NotificationKind } from "@/lib/notifications/dedupe";
import type { Database } from "@/types/supabase";

type UserPreferencesRow = Pick<
  Database["public"]["Tables"]["user_preferences"]["Row"],
  | "notify_goal"
  | "notify_full_time"
  | "notify_lineup_confirmed"
  | "notify_prediction_shift"
  | "notify_ai_insight_refreshed"
>;

export function isNotificationKindEnabled(
  prefs: UserPreferencesRow,
  kind: NotificationKind
): boolean {
  switch (kind) {
    case "GOAL_FOR_FOLLOWED_TEAM":
      return prefs.notify_goal;
    case "FULL_TIME_FOLLOWED_TEAM":
      return prefs.notify_full_time;
    case "LINEUP_CONFIRMED":
      return prefs.notify_lineup_confirmed;
    case "PREDICTION_SHIFT":
      return prefs.notify_prediction_shift;
    case "AI_INSIGHT_REFRESHED":
      return prefs.notify_ai_insight_refreshed;
    case "TRIAL_ENDING":
    case "PAYMENT_SUCCESS":
    case "PAYMENT_FAILED":
      return true;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
