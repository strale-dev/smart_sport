import { describe, expect, it, vi } from "vitest";

import { apiFootballFetch } from "@/lib/api-football/client";
import {
  ApiFootballError,
  ApiFootballQuotaError,
  ApiFootballRateLimitError,
} from "@/lib/api-football/errors";
import { classifyProviderError } from "@/lib/ingestion/classify-provider-error";

const originalEnv = { ...process.env };

function mockResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

describe("classifyProviderError", () => {
  it.each([
    {
      name: "TypeError fetch failed",
      error: new TypeError("fetch failed"),
      errorType: "network",
      retryable: true,
    },
    {
      name: "timeout ApiFootballError",
      error: new ApiFootballError("API-Football request timed out", {
        path: "/fixtures",
        statusCode: 503,
        cause: new DOMException("The operation timed out.", "TimeoutError"),
      }),
      errorType: "timeout",
      retryable: true,
    },
    {
      name: "ApiFootballQuotaError",
      error: new ApiFootballQuotaError(
        "API-Football daily quota exhausted after retries."
      ),
      errorType: "quota_exhausted",
      retryable: false,
    },
    {
      name: "ApiFootballRateLimitError",
      error: new ApiFootballRateLimitError(
        "API-Football rate limit exceeded after retries.",
        { path: "/fixtures", retryAfterMs: 2_000 }
      ),
      errorType: "rate_limited",
      retryable: true,
    },
    {
      name: "permanent 403",
      error: new ApiFootballError("Forbidden", {
        path: "/fixtures",
        statusCode: 403,
      }),
      errorType: "permanent",
      retryable: false,
    },
    {
      name: "unknown generic Error",
      error: new Error("boom"),
      errorType: "unknown",
      retryable: false,
    },
  ])("$name", ({ error, errorType, retryable }) => {
    const result = classifyProviderError(error);
    expect(result.errorType).toBe(errorType);
    expect(result.retryable).toBe(retryable);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("classifies HTTP 200 envelope with provider errors as provider_error", async () => {
    process.env = {
      ...originalEnv,
      API_FOOTBALL_KEY: "test-key",
      API_FOOTBALL_BASE_URL: "https://v3.football.api-sports.io",
    };

    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse(
        {
          get: "fixtures",
          parameters: { date: "2026-10-30" },
          errors: { requests: "Daily request limit reached." },
          results: 0,
          paging: { current: 1, total: 1 },
          response: [],
        },
        {
          headers: {
            "x-ratelimit-requests-remaining": "5000",
          },
        }
      )
    );

    const caught = await apiFootballFetch<{ fixture: { id: number } }>(
      "/fixtures",
      { date: "2026-10-30" },
      { fetchImpl }
    ).catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(ApiFootballError);
    const result = classifyProviderError(caught);
    expect(result.errorType).toBe("provider_error");
    expect(result.retryable).toBe(false);
    expect(result.reason).toContain("requests:");
  });

  it("does not leak apikey query params or API key header values in reason", () => {
    const secret = "super-secret-key-value-99";
    const withUrl = new TypeError(
      `fetch failed https://v3.football.api-sports.io/fixtures?apikey=${secret}`
    );
    const withHeader = new Error(
      `Request failed x-apisports-key: ${secret} for /fixtures`
    );

    for (const error of [withUrl, withHeader]) {
      const { reason } = classifyProviderError(error);
      expect(reason).not.toContain(secret);
      expect(reason.toLowerCase()).not.toMatch(/apikey=[^&\s]+/);
      expect(reason.toLowerCase()).not.toMatch(/x-apisports-key:\s*\S+/);
    }
  });
});
