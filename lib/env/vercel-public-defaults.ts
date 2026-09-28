/**
 * Vercel Preview/Development deployments often omit NEXT_PUBLIC_SITE_URL and
 * NEXT_PUBLIC_APP_ENV. Derive safe defaults from VERCEL_* so `next build` can
 * collect route data. Production should still set explicit values in Vercel
 * (canonical https://scorence.app, NEXT_PUBLIC_APP_ENV=production).
 */
export function getVercelPublicEnvDefaults(
  source: Record<string, string | undefined>
): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};

  const siteUrl = source.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl && source.VERCEL_URL?.trim()) {
    const host = source.VERCEL_URL.trim().replace(/^https?:\/\//, "");
    out.NEXT_PUBLIC_SITE_URL = `https://${host}`;
  }

  const appEnv = source.NEXT_PUBLIC_APP_ENV?.trim();
  if (!appEnv) {
    out.NEXT_PUBLIC_APP_ENV =
      source.VERCEL_ENV === "production" ? "production" : "development";
  }

  return out;
}

export function applyVercelPublicEnvDefaults(
  source: Record<string, string | undefined>
): Record<string, string | undefined> {
  return { ...source, ...getVercelPublicEnvDefaults(source) };
}
