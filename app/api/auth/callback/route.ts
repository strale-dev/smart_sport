import * as Sentry from "@sentry/nextjs";
import { after, NextResponse } from "next/server";

import { exchangeCodeForSession } from "@/lib/auth/exchange-code-session";
import { safeReturnTo } from "@/lib/auth/return-to";
import { sendWelcomeIfNeeded } from "@/lib/emails/send-welcome-if-needed";

const NEW_USER_WINDOW_MS = 120_000;

function isNewUser(createdAt: string | undefined): boolean {
  if (!createdAt) {
    return false;
  }

  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) {
    return false;
  }

  return Date.now() - created < NEW_USER_WINDOW_MS;
}

function resolveOrigin(request: Request): string {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv || !forwardedHost) {
    return origin;
  }

  return `https://${forwardedHost}`;
}

function redirectTo(
  request: Request,
  dest: string,
  authEvent?: "login" | "signup"
): NextResponse {
  const url = new URL(dest, resolveOrigin(request));
  if (authEvent) {
    url.searchParams.set("auth_event", authEvent);
  }

  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeReturnTo(
    requestUrl.searchParams.get("next") ??
      requestUrl.searchParams.get("returnTo"),
    { allowUpdatePassword: true }
  );

  if (!code) {
    return redirectTo(request, "/login?error=callback");
  }

  const result = await exchangeCodeForSession(code);

  if (!result.ok) {
    return redirectTo(request, "/login?error=callback");
  }

  const event = isNewUser(result.createdAt) ? "signup" : "login";

  after(async () => {
    try {
      await sendWelcomeIfNeeded({
        userId: result.userId,
        email: result.email,
        emailConfirmedAt: result.emailConfirmedAt,
        displayName: result.displayName,
      });
    } catch (error) {
      Sentry.captureException(error);
      console.error("[auth/callback] welcome email failed", error);
    }
  });

  return redirectTo(request, next, event);
}
