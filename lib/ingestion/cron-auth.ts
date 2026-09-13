import { timingSafeEqual } from "node:crypto";

import { getCronSecret, parsePublicEnv } from "@/lib/env";

function bearerTokensMatch(
  authorizationHeader: string | null,
  secret: string
): boolean {
  if (!authorizationHeader) {
    return false;
  }

  const match = authorizationHeader.trim().match(/^Bearer\s+(\S+)\s*$/i);
  if (!match) {
    return false;
  }

  const provided = match[1];
  if (provided.length !== secret.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(provided, "utf8"),
    Buffer.from(secret, "utf8")
  );
}

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

  if (!bearerTokensMatch(authorizationHeader, secret)) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized cron request.",
    };
  }

  return { ok: true };
}
