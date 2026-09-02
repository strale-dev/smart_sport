import { DEFAULT_RETURN_TO, safeReturnTo } from "@/lib/auth/return-to";
import {
  PASSWORD_RECOVERY_CALLBACK_PATH,
  UPDATE_PASSWORD_PATH,
} from "@/lib/auth/recovery";
import { publicEnv } from "@/lib/env.client";

function authOrigin(): string {
  if (typeof window === "undefined") {
    return publicEnv.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.NODE_ENV === "development") {
    return window.location.origin;
  }

  return publicEnv.NEXT_PUBLIC_SITE_URL || window.location.origin;
}

export function authCallbackUrl(returnTo: string = DEFAULT_RETURN_TO): string {
  const url = new URL("/api/auth/callback", authOrigin());
  url.searchParams.set("next", safeReturnTo(returnTo));
  return url.toString();
}

export function passwordRecoveryCallbackUrl(): string {
  return new URL(PASSWORD_RECOVERY_CALLBACK_PATH, authOrigin()).toString();
}

export function passwordRecoveryCallbackUrlForOrigin(origin: string): string {
  return new URL(PASSWORD_RECOVERY_CALLBACK_PATH, origin).toString();
}

export { PASSWORD_RECOVERY_CALLBACK_PATH, UPDATE_PASSWORD_PATH };
