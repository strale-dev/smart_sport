import { NextResponse } from "next/server";

import { exchangeCodeForSession } from "@/lib/auth/exchange-code-session";
import { UPDATE_PASSWORD_PATH } from "@/lib/auth/recovery";

function resolveOrigin(request: Request): string {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv || !forwardedHost) {
    return origin;
  }

  return `https://${forwardedHost}`;
}

function redirectTo(request: Request, dest: string): NextResponse {
  return NextResponse.redirect(new URL(dest, resolveOrigin(request)));
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return redirectTo(request, "/reset-password?error=recovery");
  }

  const result = await exchangeCodeForSession(code);

  if (!result.ok) {
    return redirectTo(request, "/reset-password?error=recovery");
  }

  return redirectTo(request, UPDATE_PASSWORD_PATH);
}
