import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export type SoundPreferences = {
  soundGoalEnabled: boolean;
  soundFullTimeEnabled: boolean;
};

const DEFAULTS: SoundPreferences = {
  soundGoalEnabled: false,
  soundFullTimeEnabled: false,
};

export async function getSoundPreferences(
  userId: string
): Promise<SoundPreferences> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("user_preferences")
    .select("sound_goal_enabled, sound_full_time_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return DEFAULTS;
  }

  return {
    soundGoalEnabled: data.sound_goal_enabled,
    soundFullTimeEnabled: data.sound_full_time_enabled,
  };
}
