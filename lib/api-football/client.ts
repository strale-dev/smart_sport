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
  getInMemoryQuotaSnapshot,
  recordQuotaFromHeaders,
  shouldRefuseNonCriticalRequest,
} from "@/lib/api-football/quota";
import type { ApiFootballEnvelope } from "@/lib/api-football/types";
import { DEFAULT_API_FOOTBALL_BASE_URL, hasApiFootballConfig } from "@/lib/env";

export type ApiFootballFetchOptions = {
  priority?: "critical" | "normal";
  fetchImpl?: typeof fetch;
};

function normalizeProviderErrors(
  errors: ApiFootballEnvelope<unknown>["errors"]
): Record<string, string> | undefined {
  if (!errors) {
    return undefined;
  }

  if (Array.isArray(errors)) {
    return errors.reduce<Record<string, string>>((acc, error, index) => {
      acc[String(index)] = String(error);
      return acc;
    }, {});
  }

  if (typeof errors === "object") {
    return Object.fromEntries(
      Object.entries(errors as Record<string, unknown>).map(([key, value]) => [
        key,
        String(value),
      ])
    );
  }

  return { message: String(errors) };
}

function hasProviderErrors(
  errors: ApiFootballEnvelope<unknown>["errors"]
): boolean {
  if (!errors) {
    return false;
  }

  if (Array.isArray(errors)) {
    return errors.length > 0;
  }

  if (typeof errors === "object") {
    return Object.keys(errors as Record<string, unknown>).length > 0;
  }

  return true;
}

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

export async function apiFootballFetch<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: ApiFootballFetchOptions = {}
): Promise<ApiFootballEnvelope<T>> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const requestKey = buildRequestKey(path, params);
  const priority = options.priority ?? "normal";

  return withInFlightDedup(requestKey, async () => {
    const quotaSnapshot = getInMemoryQuotaSnapshot();
    if (
      priority === "normal" &&
      shouldRefuseNonCriticalRequest(quotaSnapshot)
    ) {
      throw new ApiFootballQuotaError(
        "API-Football daily quota is low; non-critical request refused."
      );
    }

    const apiKey = getApiKey();
    const url = buildUrl(path, params);

    const response = await pRetry(
      async () => {
        const result = await fetchImpl(url, {
          method: "GET",
          headers: {
            "x-apisports-key": apiKey,
          },
          cache: "no-store",
        });

        if (isRetryableStatus(result.status)) {
          throw new ApiFootballError(`Retryable HTTP ${result.status}`, {
            statusCode: result.status,
            path,
          });
        }

        return result;
      },
      {
        retries: API_FOOTBALL_CONFIG.retry.retries,
        factor: API_FOOTBALL_CONFIG.retry.factor,
        minTimeout: API_FOOTBALL_CONFIG.retry.minTimeoutMs,
        maxTimeout: API_FOOTBALL_CONFIG.retry.maxTimeoutMs,
        onFailedAttempt: (error) => {
          if (
            error instanceof ApiFootballError &&
            error.statusCode !== undefined &&
            !isRetryableStatus(error.statusCode)
          ) {
            throw error;
          }
        },
      }
    );

    await recordQuotaFromHeaders(response.headers);

    if (!response.ok) {
      throw new ApiFootballError(`API-Football HTTP ${response.status}`, {
        statusCode: response.status,
        path,
      });
    }

    const payload = (await response.json()) as ApiFootballEnvelope<T>;

    if (hasProviderErrors(payload.errors)) {
      throw new ApiFootballError("API-Football provider returned errors", {
        path,
        providerErrors: normalizeProviderErrors(payload.errors),
      });
    }

    return payload;
  });
}

export async function apiFootballFetchResponse<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: ApiFootballFetchOptions = {}
): Promise<T[]> {
  const envelope = await apiFootballFetch<T[]>(path, params, options);
  return envelope.response ?? [];
}
