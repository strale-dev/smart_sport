import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  applyReturnTo,
  DEFAULT_RETURN_TO,
  safeReturnTo,
} from "@/lib/auth/return-to";
import {
  isAuthPagePath,
  isAuthRequiredPath,
  isUpdatePasswordPath,
} from "@/lib/auth/routes";
import { env } from "@/lib/env.server";
import type { Database } from "@/types/supabase";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const returnToParam = request.nextUrl.searchParams.get("returnTo");

  if (isUpdatePasswordPath(pathname)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/reset-password";
      url.search = "";
      return copyCookies(NextResponse.redirect(url), supabaseResponse);
    }

    return supabaseResponse;
  }

  if (!user && isAuthRequiredPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const dest = `${pathname}${request.nextUrl.search}`;
    url.search = "";
    url.searchParams.set("returnTo", dest);
    return copyCookies(NextResponse.redirect(url), supabaseResponse);
  }

  if (user && isAuthPagePath(pathname)) {
    const url = request.nextUrl.clone();
    applyReturnTo(url, safeReturnTo(returnToParam) || DEFAULT_RETURN_TO);
    return copyCookies(NextResponse.redirect(url), supabaseResponse);
  }

  return supabaseResponse;
}

function copyCookies(target: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  return target;
}
