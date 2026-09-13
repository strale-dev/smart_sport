/**
 * Called from .github/workflows/ingestion-schedule.yml to hit Production cron routes.
 * Requires env: CRON_SECRET (repo secret). Optional: PRODUCTION_SITE_URL (repo variable).
 */
const cronPath = process.argv[2];

const DEFAULT_SITE_URL = "https://scorence.app";

function normalizeSiteUrl(raw) {
  const trimmed = (raw ?? DEFAULT_SITE_URL).trim();
  if (!trimmed) {
    return DEFAULT_SITE_URL;
  }
  return trimmed.replace(/\/+$/, "");
}

if (!cronPath || !cronPath.startsWith("/api/cron/")) {
  console.error(
    "::error::Usage: node scripts/trigger-production-cron.mjs /api/cron/<job>"
  );
  process.exit(1);
}

const cronSecret = process.env.CRON_SECRET?.trim();
if (!cronSecret) {
  console.error(
    "::error::Missing repository secret CRON_SECRET. Set it to the same value as Vercel Production → CRON_SECRET (see docs/ING-3-pro-cutover.md)."
  );
  process.exit(1);
}

const siteUrl = normalizeSiteUrl(process.env.PRODUCTION_SITE_URL);
const url = `${siteUrl}${cronPath}`;

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 55_000);

try {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
    signal: controller.signal,
  });

  const body = await response.text();

  if (!response.ok) {
    console.error(
      `::error::Cron ${cronPath} returned HTTP ${response.status} from ${siteUrl}`
    );
    if (body) {
      console.error(body.slice(0, 4000));
    }
    process.exit(1);
  }

  console.log(body || "(empty body, HTTP 2xx)");
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Unknown request error";
  console.error(`::error::Failed to call ${url}: ${message}`);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
