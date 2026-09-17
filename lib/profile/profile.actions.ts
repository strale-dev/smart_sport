"use server";

import { cookies } from "next/headers";

import {
  avatarUrlSchema,
  displayNameSchema,
  preferredLeagueIdSchema,
  timezoneSchema,
} from "@/lib/profile/schema";
import { isPreferrableLeagueId } from "@/lib/services/userService";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export type ProfileActionResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "VALIDATION_FAILED"
        | "UPDATE_FAILED"
        | "INVALID_LEAGUE";
    };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return user;
}

export async function updateDisplayName(
  displayName: string
): Promise<ProfileActionResult> {
  const user = await requireUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  const parsed = displayNameSchema.safeParse(displayName);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_FAILED" };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", user.id);

  if (error) {
    return { ok: false, code: "UPDATE_FAILED" };
  }

  return { ok: true };
}

export async function updateAvatarUrl(
  avatarUrl: string
): Promise<ProfileActionResult> {
  const user = await requireUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  const parsed = avatarUrlSchema.safeParse(avatarUrl);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_FAILED" };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: parsed.data })
    .eq("id", user.id);

  if (error) {
    return { ok: false, code: "UPDATE_FAILED" };
  }

  return { ok: true };
}

export async function updateTimezone(
  timezone: string
): Promise<ProfileActionResult> {
  const user = await requireUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  const parsed = timezoneSchema.safeParse(timezone);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_FAILED" };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("profiles")
    .update({ timezone: parsed.data })
    .eq("id", user.id);

  if (error) {
    return { ok: false, code: "UPDATE_FAILED" };
  }

  return { ok: true };
}

export async function updatePreferredLeague(
  preferredLeagueId: string | null
): Promise<ProfileActionResult> {
  const user = await requireUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  const parsed = preferredLeagueIdSchema.safeParse(preferredLeagueId);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_FAILED" };
  }

  const leagueId = parsed.data ?? null;
  if (!(await isPreferrableLeagueId(leagueId))) {
    return { ok: false, code: "INVALID_LEAGUE" };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_league_id: leagueId })
    .eq("id", user.id);

  if (error) {
    return { ok: false, code: "UPDATE_FAILED" };
  }

  return { ok: true };
}
