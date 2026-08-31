import { getCronSecret, parsePublicEnv } from "@/lib/env";

export type CronAuthResult =
  { ok: true } | { ok: false; status: number; message: string };

export function verifyCronRequest(
  authorizationHeader: string | null,
  source: Record<string, string | undefined> = process.env
): CronAuthResult {
  const secret = getCronSecret(source);
  const { NEXT_PUBLIC_APP_ENV } = parsePublicEnv(source);

  if (!secret) {
    if (NEXT_PUBLIC_APP_ENV === "development") {
      return { ok: true };
    }

    return {
      ok: false,
      status: 503,
      message: "CRON_SECRET is not configured.",
    };
  }

  const expected = `Bearer ${secret}`;
  if (authorizationHeader !== expected) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized cron request.",
    };
  }

  return { ok: true };
}
