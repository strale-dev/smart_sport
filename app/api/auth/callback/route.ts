import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { safeReturnTo } from "@/lib/auth/return-to";
import { createClient } from "@/lib/supabase/server";

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

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return redirectTo(request, "/login?error=callback");
  }

  const event = isNewUser(data.user.created_at) ? "signup" : "login";
  return redirectTo(request, next, event);
}
