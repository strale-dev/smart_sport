import { DEFAULT_RETURN_TO, safeReturnTo } from "@/lib/auth/return-to";

export function authCallbackUrl(returnTo: string = DEFAULT_RETURN_TO): string {
  const url = new URL("/api/auth/callback", window.location.origin);
  url.searchParams.set("next", safeReturnTo(returnTo));
  return url.toString();
}

export function passwordRecoveryCallbackUrl(): string {
  const url = new URL("/api/auth/callback", window.location.origin);
  url.searchParams.set(
    "next",
    safeReturnTo("/update-password", { allowUpdatePassword: true })
  );
  return url.toString();
}
