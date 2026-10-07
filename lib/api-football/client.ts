import pRetry from "p-retry";

import {
  getApiFootballBaseUrl,
  API_FOOTBALL_CONFIG,
} from "@/lib/api-football/config";
import { withInFlightDedup } from "@/lib/api-football/dedup";
import {
  ApiFootballConfigError,
  ApiFootballError,
  ApiFootballQuotaError,
  isRetryableStatus,
} from "@/lib/api-football/errors";
import {
  buildProviderErrorOutcome,
  envelopeOutcomeKind,
  logApiFootballRequest,
  mapExhaustedRetryError,
  mapOutcomeToError,
  hasProviderErrors,
  normalizeProviderErrors,
  parseAndValidateEnvelope,
  parseRetryAfterMs,
  type ApiFootballFetchOutcome,
} from "@/lib/api-football/fetch-outcome";
import {
  getInMemoryQuotaSnapshot,
  hydrateQuotaFromRedis,
  recordQuotaFromHeaders,
  shouldRefuseNonCriticalRequest,
} from "@/lib/api-football/quota";
import type { ApiFootballEnvelope } from "@/lib/api-football/types";
import { DEFAULT_API_FOOTBALL_BASE_URL, hasApiFootballConfig } from "@/lib/env";

export type ApiFootballFetchOptions = {
  priority?: "critical" | "normal";
  fetchImpl?: typeof fetch;
};

export type ApiFootballFetchAllPagesOptions = ApiFootballFetchOptions & {
  /** Safety cap (default 100 pages). */
  maxPages?: number;
  /** Called after each page (e.g. ingestion throttle). */
  onAfterPage?: (info: {
    page: number;
    totalPages: number;
  }) => void | Promise<void>;
};

function buildUrl(
  path: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const baseUrl = getApiFootballBaseUrl(
    process.env.API_FOOTBALL_BASE_URL ?? DEFAULT_API_FOOTBALL_BASE_URL
  );
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    `${baseUrl}/`
  );

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function buildRequestKey(
  path: string,
  params: Record<string, unknown>
): string {
  const sorted = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");

  return `${path}?${sorted}`;
}

function getApiKey(): string {
  if (!hasApiFootballConfig(process.env)) {
    throw new ApiFootballConfigError(
      "API_FOOTBALL_KEY is not configured. Set it in .env.local before calling the live API."
    );
  }

  return process.env.API_FOOTBALL_KEY!;
}

function isFetchTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === "AbortError" || error.name === "TimeoutError") {
    return true;
  }

  return (
    error.cause instanceof Error &&
    (error.cause.name === "AbortError" || error.cause.name === "TimeoutError")
  );
}

async function parseResponseBody(
  response: Response,
  path: string
): Promise<
  | { ok: true; body: unknown }
  | { ok: false; outcome: ApiFootballFetchOutcome<never> }
> {
  const text = await response.text();

  if (!text.trim()) {
    return {
      ok: false,
      outcome: {
        kind: "permanent",
        httpStatus: response.status,
        path,
        message: "API-Football response body was empty",
      },
    };
  }

  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch (cause) {
    return {
      ok: false,
      outcome: {
        kind: "permanent",
        httpStatus: response.status,
        path,
        message: "API-Football response body is not valid JSON",
        cause,
      },
    };
  }
}

function outcomeFromHttpResponse<T>(
  response: Response,
  path: string,
  body: unknown
): ApiFootballFetchOutcome<T> {
  if (!response.ok) {
    if (isRetryableStatus(response.status)) {
      return {
        kind: "retryable",
        httpStatus: response.status,
        path,
        message: `Retryable HTTP ${response.status}`,
        retryAfterMs: parseRetryAfterMs(response.headers.get("Retry-After")),
      };
    }

    return {
      kind: "permanent",
      httpStatus: response.status,
      path,
      message: `API-Football HTTP ${response.status}`,
    };
  }

  const validated = parseAndValidateEnvelope<T>(body, path);
  if (!validated.ok) {
    return {
      kind: "permanent",
      httpStatus: response.status,
      path,
      message: validated.message,
    };
  }

  if (hasProviderErrors(validated.envelope.errors)) {
    const providerErrors = normalizeProviderErrors(validated.envelope.errors)!;
    return buildProviderErrorOutcome(response.status, path, providerErrors);
  }

  const kind = envelopeOutcomeKind(validated.envelope);
  return {
    kind,
    data: validated.envelope,
    httpStatus: response.status,
  };
}

export async function apiFootballFetchOutcome<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: ApiFootballFetchOptions = {}
): Promise<ApiFootballFetchOutcome<T>> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const requestKey = buildRequestKey(path, params);
  const priority = options.priority ?? "normal";

  return withInFlightDedup(requestKey, async () => {
    const startedAt = Date.now();
    let attempts = 0;

    await hydrateQuotaFromRedis();
    const quotaSnapshot = getInMemoryQuotaSnapshot();
    if (
      priority === "normal" &&
      shouldRefuseNonCriticalRequest(quotaSnapshot)
    ) {
      logApiFootballRequest({
        scope: "api-football/client",
        path,
        outcome: "quota_refused",
        durationMs: Date.now() - startedAt,
        attempts: 0,
      });
      throw new ApiFootballQuotaError(
        "API-Football daily quota is low; non-critical request refused."
      );
    }

    const apiKey = getApiKey();
    const url = buildUrl(path, params);

    let response: Response;
    try {
      response = await pRetry(
        async () => {
          attempts += 1;
          try {
            const result = await fetchImpl(url, {
              method: "GET",
              headers: {
                "x-apisports-key": apiKey,
              },
              cache: "no-store",
              signal: AbortSignal.timeout(API_FOOTBALL_CONFIG.requestTimeoutMs),
            });

            if (isRetryableStatus(result.status)) {
              throw new ApiFootballError(`Retryable HTTP ${result.status}`, {
                statusCode: result.status,
                path,
                retryAfterMs: parseRetryAfterMs(
                  result.headers.get("Retry-After")
                ),
              });
            }

            return result;
          } catch (error) {
            if (error instanceof ApiFootballError) {
              throw error;
            }

            if (isFetchTimeoutError(error)) {
              throw new ApiFootballError("API-Football request timed out", {
                path,
                statusCode: 503,
                cause: error,
              });
            }

            throw error;
          }
        },
        {
          retries: API_FOOTBALL_CONFIG.retry.retries,
          factor: API_FOOTBALL_CONFIG.retry.factor,
          minTimeout: API_FOOTBALL_CONFIG.retry.minTimeoutMs,
          maxTimeout: API_FOOTBALL_CONFIG.retry.maxTimeoutMs,
          randomize: API_FOOTBALL_CONFIG.retry.randomize,
          onFailedAttempt: async ({ error, retryDelay }) => {
            if (
              error instanceof ApiFootballError &&
              error.statusCode !== undefined &&
              !isRetryableStatus(error.statusCode)
            ) {
              throw error;
            }

            if (
              error instanceof ApiFootballError &&
              error.retryAfterMs != null
            ) {
              const extra = Math.max(0, error.retryAfterMs - retryDelay);
              if (extra > 0) {
                await new Promise((resolve) => setTimeout(resolve, extra));
              }
            }
          },
        }
      );
    } catch (error) {
      mapExhaustedRetryError(
        error,
        path,
        getInMemoryQuotaSnapshot().dayRemaining
      );
    }

    await recordQuotaFromHeaders(response.headers);

    if (!response.ok) {
      const outcome: ApiFootballFetchOutcome<T> = {
        kind: "permanent",
        httpStatus: response.status,
        path,
        message: `API-Football HTTP ${response.status}`,
      };
      logApiFootballRequest({
        scope: "api-football/client",
        path,
        outcome: outcome.kind,
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        attempts,
      });
      return outcome;
    }

    const parsed = await parseResponseBody(response, path);
    if (!parsed.ok) {
      logApiFootballRequest({
        scope: "api-football/client",
        path,
        outcome: parsed.outcome.kind,
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        attempts,
      });
      return parsed.outcome as ApiFootballFetchOutcome<T>;
    }

    const outcome = outcomeFromHttpResponse<T>(response, path, parsed.body);

    if (outcome.kind === "provider_error") {
      logApiFootballRequest({
        scope: "api-football/client",
        path,
        outcome: "provider_error",
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        attempts,
      });
      return outcome;
    }

    logApiFootballRequest({
      scope: "api-football/client",
      path,
      outcome: outcome.kind === "empty" ? "empty" : "success",
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
      attempts,
    });

    return outcome;
  });
}

export async function apiFootballFetch<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: ApiFootballFetchOptions = {}
): Promise<ApiFootballEnvelope<T>> {
  const outcome = await apiFootballFetchOutcome<T>(path, params, options);
  return mapOutcomeToError(outcome);
}

export async function apiFootballFetchResponse<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: ApiFootballFetchOptions = {}
): Promise<T[]> {
  const envelope = await apiFootballFetch<T[]>(path, params, options);
  return envelope.response ?? [];
}

/** API-Football v3 rejects `page` on /fixtures; use round/status/from-to splits instead. */
export function apiFootballPathSupportsPageParam(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized !== "/fixtures";
}

export async function apiFootballFetchAllPages<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: ApiFootballFetchAllPagesOptions = {}
): Promise<T[]> {
  if (!apiFootballPathSupportsPageParam(path)) {
    const rows = await apiFootballFetchResponse<T>(path, params, options);
    if (options.onAfterPage) {
      await options.onAfterPage({ page: 1, totalPages: 1 });
    }
    return rows;
  }

  const maxPages = options.maxPages ?? 100;
  const merged: T[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    const envelope = await apiFootballFetch<T[]>(
      path,
      { ...params, page },
      options
    );
    const chunk = envelope.response ?? [];
    merged.push(...chunk);

    const reportedTotal = envelope.paging?.total;
    totalPages =
      reportedTotal != null && reportedTotal > 0
        ? reportedTotal
        : chunk.length === 0
          ? page
          : 1;

    if (options.onAfterPage) {
      await options.onAfterPage({ page, totalPages });
    }

    if (reportedTotal == null && chunk.length > 0) {
      break;
    }

    page += 1;
  }

  return merged;
}

export async function apiFootballFetchAllPagesResponse<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: ApiFootballFetchAllPagesOptions = {}
): Promise<T[]> {
  return apiFootballFetchAllPages<T>(path, params, options);
}
