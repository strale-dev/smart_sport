import { sanitizeTimezone } from "@/lib/datetime/timezone";

export const VIEWER_TIMEZONE_COOKIE = "viewer_timezone";

export function readViewerTimezoneCookie(
  source: Record<string, string | undefined>
): string | null {
  const raw = source[VIEWER_TIMEZONE_COOKIE];
  if (!raw?.trim()) {
    return null;
  }

  return sanitizeTimezone(decodeURIComponent(raw));
}

export function resolveViewerTimezoneFromSources(input: {
  userId: string | null;
  profileTimeZone?: string | null;
  cookieTimeZone?: string | null;
}): string {
  const profileTimeZone = input.profileTimeZone
    ? sanitizeTimezone(input.profileTimeZone)
    : null;
  const cookieTimeZone = input.cookieTimeZone
    ? sanitizeTimezone(input.cookieTimeZone)
    : null;

  if (input.userId && profileTimeZone && profileTimeZone !== "UTC") {
    return profileTimeZone;
  }

  if (cookieTimeZone && cookieTimeZone !== "UTC") {
    return cookieTimeZone;
  }

  if (input.userId && profileTimeZone) {
    return profileTimeZone;
  }

  return cookieTimeZone ?? "UTC";
}
