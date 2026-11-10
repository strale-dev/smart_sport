/** Next.js throws when `cookies()` / `headers()` run during static prerender. */
export function isDynamicServerUsageError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const digest = "digest" in error ? String(error.digest) : "";
  if (digest === "DYNAMIC_SERVER_USAGE") {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Dynamic server usage");
}
