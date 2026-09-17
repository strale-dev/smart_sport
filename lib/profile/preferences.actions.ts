"use server";

import { cookies } from "next/headers";

import {
  notificationPreferencesSchema,
  type NotificationPreferencesInput,
} from "@/lib/profile/schema";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export type PreferencesActionResult =
  | { ok: true }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "VALIDATION_FAILED" | "UPDATE_FAILED";
    };

export async function updateNotificationPreferences(
  input: NotificationPreferencesInput
): Promise<PreferencesActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_FAILED" };
  }

  const patch: {
    notify_goal?: boolean;
    notify_full_time?: boolean;
    notify_lineup_confirmed?: boolean;
    notify_prediction_shift?: boolean;
    notify_ai_insight_refreshed?: boolean;
  } = {};
  if (typeof parsed.data.notifyGoal === "boolean") {
    patch.notify_goal = parsed.data.notifyGoal;
  }
  if (typeof parsed.data.notifyFullTime === "boolean") {
    patch.notify_full_time = parsed.data.notifyFullTime;
  }
  if (typeof parsed.data.notifyLineupConfirmed === "boolean") {
    patch.notify_lineup_confirmed = parsed.data.notifyLineupConfirmed;
  }
  if (typeof parsed.data.notifyPredictionShift === "boolean") {
    patch.notify_prediction_shift = parsed.data.notifyPredictionShift;
  }
  if (typeof parsed.data.notifyAiInsightRefreshed === "boolean") {
    patch.notify_ai_insight_refreshed = parsed.data.notifyAiInsightRefreshed;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("user_preferences")
    .update(patch)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, code: "UPDATE_FAILED" };
  }

  return { ok: true };
}

export async function updateEmailMarketingOptIn(
  enabled: boolean
): Promise<PreferencesActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("user_preferences")
    .update({ email_marketing_optin: enabled })
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, code: "UPDATE_FAILED" };
  }

  return { ok: true };
}
