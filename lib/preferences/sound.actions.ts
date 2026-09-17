"use server";

import { getCurrentUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export type UpdateSoundPreferencesInput = {
  soundGoalEnabled?: boolean;
  soundFullTimeEnabled?: boolean;
};

export type UpdateSoundPreferencesResult =
  { ok: true } | { ok: false; code: "SIGN_IN_REQUIRED" | "UPDATE_FAILED" };

export async function updateSoundPreferences(
  input: UpdateSoundPreferencesInput
): Promise<UpdateSoundPreferencesResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  const patch: {
    sound_goal_enabled?: boolean;
    sound_full_time_enabled?: boolean;
  } = {};
  if (typeof input.soundGoalEnabled === "boolean") {
    patch.sound_goal_enabled = input.soundGoalEnabled;
  }
  if (typeof input.soundFullTimeEnabled === "boolean") {
    patch.sound_full_time_enabled = input.soundFullTimeEnabled;
  }

  if (
    patch.sound_goal_enabled === undefined &&
    patch.sound_full_time_enabled === undefined
  ) {
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
