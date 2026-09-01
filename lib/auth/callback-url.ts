import { DEFAULT_RETURN_TO, safeReturnTo } from "@/lib/auth/return-to";
import {
  PASSWORD_RECOVERY_CALLBACK_PATH,
  UPDATE_PASSWORD_PATH,
} from "@/lib/auth/recovery";

export function authCallbackUrl(returnTo: string = DEFAULT_RETURN_TO): string {
  const url = new URL("/api/auth/callback", window.location.origin);
  url.searchParams.set("next", safeReturnTo(returnTo));
  return url.toString();
}

export function passwordRecoveryCallbackUrl(): string {
  return new URL(
    PASSWORD_RECOVERY_CALLBACK_PATH,
    window.location.origin
  ).toString();
}

export function passwordRecoveryCallbackUrlForOrigin(origin: string): string {
  return new URL(PASSWORD_RECOVERY_CALLBACK_PATH, origin).toString();
}

export { PASSWORD_RECOVERY_CALLBACK_PATH, UPDATE_PASSWORD_PATH };
