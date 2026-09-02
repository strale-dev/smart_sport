export const AUTH_REQUIRED_PREFIXES = [
  "/dashboard",
  "/predictions",
  "/profile",
  "/favorites",
] as const;

export const GUEST_OK_PREFIXES = [
  "/fixtures",
  "/live",
  "/matches",
  "/teams",
  "/players",
  "/leagues",
] as const;

export const AUTH_PAGE_PATHS = [
  "/login",
  "/signup",
  "/reset-password",
] as const;

export const UPDATE_PASSWORD_PATH = "/update-password";

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAuthRequiredPath(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  );
}

export function isGuestOkPath(pathname: string): boolean {
  return GUEST_OK_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isAuthPagePath(pathname: string): boolean {
  return AUTH_PAGE_PATHS.some((path) => matchesPrefix(pathname, path));
}

export function isUpdatePasswordPath(pathname: string): boolean {
  return matchesPrefix(pathname, UPDATE_PASSWORD_PATH);
}
