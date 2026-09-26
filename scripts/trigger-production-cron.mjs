/**
 * Called from .github/workflows/ingestion-schedule.yml to hit Production cron routes.
 * Requires env: CRON_SECRET (repo secret). Optional: PRODUCTION_SITE_URL (repo variable).
 */
const cronPath = process.argv[2];

const DEFAULT_SITE_URL = "https://scorence.app";
const REQUEST_TIMEOUT_MS = 58_000;
const MAX_ATTEMPTS = 3;
const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504]);

function normalizeSiteUrl(raw) {
  const trimmed = (raw ?? DEFAULT_SITE_URL).trim();
  if (!trimmed) {
    return DEFAULT_SITE_URL;
  }
  return trimmed.replace(/\/+$/, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error) {
  return error instanceof Error && error.name === "AbortError";
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

let lastErrorMessage = "Unknown request error";

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
      signal: controller.signal,
    });

    const body = await response.text();

    if (response.ok) {
      console.log(body || "(empty body, HTTP 2xx)");
      try {
        const payload = body ? JSON.parse(body) : null;
        if (payload && payload.ok === false && !payload.skipped) {
          console.error(
            `::error::Cron ${cronPath} returned HTTP 200 but ok:false (degraded=${payload.degraded ?? "n/a"})`
          );
          process.exit(1);
        }
      } catch {
        // Non-JSON success body — treat as success.
      }
      process.exit(0);
    }

    lastErrorMessage = `HTTP ${response.status}`;
    console.error(
      `::warning::Cron ${cronPath} attempt ${attempt}/${MAX_ATTEMPTS} returned HTTP ${response.status} from ${siteUrl}`
    );
    if (body) {
      console.error(body.slice(0, 4000));
    }

    const shouldRetry =
      attempt < MAX_ATTEMPTS && RETRYABLE_HTTP.has(response.status);
    if (!shouldRetry) {
      console.error(
        `::error::Cron ${cronPath} returned HTTP ${response.status} from ${siteUrl}`
      );
      process.exit(1);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown request error";
    lastErrorMessage = message;
    console.error(
      `::warning::Cron ${cronPath} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${message}`
    );

    const shouldRetry =
      attempt < MAX_ATTEMPTS &&
      (isAbortError(error) || message.includes("fetch failed"));
    if (!shouldRetry) {
      console.error(`::error::Failed to call ${url}: ${message}`);
      process.exit(1);
    }
  } finally {
    clearTimeout(timeout);
  }

  await sleep(attempt * 2_000);
}

console.error(`::error::Failed to call ${url}: ${lastErrorMessage}`);
process.exit(1);
