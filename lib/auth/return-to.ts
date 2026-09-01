export const DEFAULT_RETURN_TO = "/";

const BLOCKED_AUTH_PATHS = ["/login", "/signup", "/reset-password"] as const;
const UPDATE_PASSWORD_PATH = "/update-password";

export type SafeReturnToOptions = {
  allowUpdatePassword?: boolean;
};

function pathnameOf(dest: string): string {
  const path = dest.split("?")[0] ?? dest;
  return path.split("#")[0] ?? path;
}

function isBlockedAuthPath(
  pathname: string,
  options: SafeReturnToOptions
): boolean {
  if (
    pathname === UPDATE_PASSWORD_PATH ||
    pathname.startsWith(`${UPDATE_PASSWORD_PATH}/`)
  ) {
    return !options.allowUpdatePassword;
  }

  return BLOCKED_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function safeReturnTo(
  value: string | null | undefined,
  options: SafeReturnToOptions = {}
): string {
  if (!value) {
    return DEFAULT_RETURN_TO;
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return DEFAULT_RETURN_TO;
  }

  if (!decoded.startsWith("/")) {
    return DEFAULT_RETURN_TO;
  }

  if (decoded.startsWith("//") || decoded.startsWith("/\\")) {
    return DEFAULT_RETURN_TO;
  }

  if (decoded.includes("\\") || decoded.includes("://")) {
    return DEFAULT_RETURN_TO;
  }

  const pathname = pathnameOf(decoded);
  if (pathname.length === 0) {
    return DEFAULT_RETURN_TO;
  }

  if (isBlockedAuthPath(pathname, options)) {
    return DEFAULT_RETURN_TO;
  }

  return decoded;
}

export function loginHref(returnTo?: string): string {
  const dest = safeReturnTo(returnTo);
  if (dest === DEFAULT_RETURN_TO) {
    return "/login";
  }

  return `/login?returnTo=${encodeURIComponent(dest)}`;
}

export function applyReturnTo(url: URL, dest: string): void {
  const safe = dest.startsWith("/") ? dest : DEFAULT_RETURN_TO;
  const [path, search] = safe.split("?");
  url.pathname = path || DEFAULT_RETURN_TO;
  url.search = search ? `?${search}` : "";
}
