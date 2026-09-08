import "server-only";

import { cookies } from "next/headers";

import {
  readViewerTimezoneCookie,
  resolveViewerTimezoneFromSources,
  VIEWER_TIMEZONE_COOKIE,
} from "@/lib/datetime/viewer-timezone";
import { readProfileTimezone } from "@/lib/supabase/profile";

export async function resolveViewerTimezone(
  userId: string | null
): Promise<string> {
  const cookieStore = await cookies();
  const cookieTimeZone = readViewerTimezoneCookie({
    [VIEWER_TIMEZONE_COOKIE]: cookieStore.get(VIEWER_TIMEZONE_COOKIE)?.value,
  });

  const profileTimeZone = userId ? await readProfileTimezone(userId) : null;

  return resolveViewerTimezoneFromSources({
    userId,
    profileTimeZone,
    cookieTimeZone,
  });
}
