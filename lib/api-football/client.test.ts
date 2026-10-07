import pRetry from "p-retry";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("p-retry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("p-retry")>();
  return {
    default: vi.fn(actual.default),
  };
});

import {
  apiFootballFetch,
  apiFootballFetchAllPagesResponse,
  apiFootballFetchOutcome,
  apiFootballFetchResponse,
} from "@/lib/api-football/client";
import {
  ApiFootballError,
  ApiFootballQuotaError,
  ApiFootballRateLimitError,
} from "@/lib/api-football/errors";
import { parseRetryAfterMs } from "@/lib/api-football/fetch-outcome";
import { optionalProviderFetch } from "@/lib/api-football/safe-call";
import { resetInFlightDedupForTests } from "@/lib/api-football/dedup";
import {
  getInMemoryQuotaSnapshot,
  recordQuotaFromHeaders,
  resetInMemoryQuotaForTests,
} from "@/lib/api-football/quota";
import { loadApiFootballFixture } from "@/tests/helpers/load-api-football-fixture";

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

describe("recordQuotaFromHeaders", () => {
  beforeEach(() => {
    resetInMemoryQuotaForTests();
  });

  it("stores remaining quota in memory", async () => {
    const headers = new Headers({
      "x-ratelimit-requests-remaining": "120",
      "x-ratelimit-remaining": "8",
    });

    await recordQuotaFromHeaders(headers);
    const snapshot = getInMemoryQuotaSnapshot();

    expect(snapshot.dayRemaining).toBe(120);
    expect(snapshot.minuteRemaining).toBe(8);
  });
});

describe("apiFootballFetch", () => {
  beforeEach(() => {
    resetInFlightDedupForTests();
    resetInMemoryQuotaForTests();
    process.env = {
      ...originalEnv,
      API_FOOTBALL_KEY: "test-key",
      API_FOOTBALL_BASE_URL: "https://v3.football.api-sports.io",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("parses a successful envelope", async () => {
    const fixture = loadApiFootballFixture("fixture-by-id.json");
    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse(fixture, {
        headers: {
          "x-ratelimit-requests-remaining": "5000",
        },
      })
    );

    const result = await apiFootballFetch(
      "/fixtures",
      { id: 1035037 },
      { fetchImpl }
    );

    expect(result.response).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers?.["x-apisports-key"]).toBe(
      "test-key"
    );
  });

  it("deduplicates concurrent requests with the same key", async () => {
    const fixture = loadApiFootballFixture("fixture-by-id.json");
    const fetchImpl = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve(
                mockResponse(fixture, {
                  headers: {
                    "x-ratelimit-requests-remaining": "5000",
                  },
                })
              ),
            20
          );
        })
    );

    const [first, second] = await Promise.all([
      apiFootballFetch("/fixtures", { id: 1035037 }, { fetchImpl }),
      apiFootballFetch("/fixtures", { id: 1035037 }, { fetchImpl }),
    ]);

    expect(first.response).toEqual(second.response);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 responses", async () => {
    const fixture = loadApiFootballFixture("fixture-by-id.json");
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({}, { status: 429 }))
      .mockResolvedValueOnce(
        mockResponse(fixture, {
          headers: {
            "x-ratelimit-requests-remaining": "5000",
          },
        })
      );

    const result = await apiFootballFetch(
      "/fixtures",
      { id: 1035037 },
      { fetchImpl }
    );

    expect(result.results).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws when API key is missing", async () => {
    delete process.env.API_FOOTBALL_KEY;

    await expect(
      apiFootballFetch(
        "/fixtures",
        { id: 1035037 },
        {
          fetchImpl: vi.fn(),
        }
      )
    ).rejects.toThrow(/API_FOOTBALL_KEY is not configured/);
  });

  it("refuses non-critical requests when quota is low", async () => {
    await recordQuotaFromHeaders(
      new Headers({
        "x-ratelimit-requests-remaining": "0",
      })
    );

    expect(getInMemoryQuotaSnapshot().isLowBudget).toBe(true);

    await expect(
      apiFootballFetch(
        "/fixtures",
        { id: 1035037 },
        {
          fetchImpl: vi.fn(),
          priority: "normal",
        }
      )
    ).rejects.toBeInstanceOf(ApiFootballQuotaError);
  });

  it("allows critical requests when quota is low", async () => {
    const fixture = loadApiFootballFixture("fixture-by-id.json");
    await recordQuotaFromHeaders(
      new Headers({
        "x-ratelimit-requests-remaining": "0",
      })
    );

    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse(fixture, {
        headers: {
          "x-ratelimit-requests-remaining": "0",
        },
      })
    );

    const result = await apiFootballFetch(
      "/fixtures",
      { id: 1035037 },
      { fetchImpl, priority: "critical" }
    );

    expect(result.response).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects an HTTP 200 envelope carrying provider errors", async () => {
    const fixture = loadApiFootballFixture("ip-not-allowed.json");
    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse(fixture, {
        headers: {
          "x-ratelimit-requests-remaining": "7499",
        },
      })
    );

    const error = await apiFootballFetch(
      "/fixtures/events",
      { fixture: 1570378 },
      { fetchImpl }
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiFootballError);
    expect((error as ApiFootballError).providerErrors).toEqual({
      Ip: "This IP is not allowed to call the API, check the list of allowed IPs in the dashboard.",
    });
  });

  it("surfaces the provider error reason instead of an empty result", async () => {
    const fixture = loadApiFootballFixture("ip-not-allowed.json");
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse(fixture));

    const result = await optionalProviderFetch("fixture events", () =>
      apiFootballFetchResponse(
        "/fixtures/events",
        { fixture: 1570378 },
        {
          fetchImpl,
        }
      )
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain(
      "This IP is not allowed to call the API"
    );
  });

  it("does not send page on /fixtures (provider rejects page param)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse(
        {
          get: "fixtures",
          parameters: { league: 39, season: 2024 },
          errors: [],
          results: 1,
          paging: { current: 1, total: 1 },
          response: [{ fixture: { id: 1000 } }],
        },
        {
          headers: {
            "x-ratelimit-requests-remaining": "5000",
          },
        }
      )
    );

    const rows = await apiFootballFetchAllPagesResponse<{
      fixture: { id: number };
    }>("/fixtures", { league: 39, season: 2024 }, { fetchImpl });

    expect(rows).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = String(fetchImpl.mock.calls[0]?.[0] ?? "");
    expect(url).not.toMatch(/[?&]page=/);
  });

  it("fetches all pages when paging.total > 1 on pageable endpoints", async () => {
    const fetchImpl = vi.fn().mockImplementation((_url: string) => {
      const callIndex = fetchImpl.mock.calls.length;
      const page = callIndex;
      return Promise.resolve(
        mockResponse(
          {
            get: "players",
            parameters: { league: 39, season: 2024, page },
            errors: [],
            results: 1,
            paging: { current: page, total: 2 },
            response: [{ player: { id: page * 1000 } }],
          },
          {
            headers: {
              "x-ratelimit-requests-remaining": "5000",
            },
          }
        )
      );
    });

    const rows = await apiFootballFetchAllPagesResponse<{
      player: { id: number };
    }>("/players", { league: 39, season: 2024 }, { fetchImpl });

    expect(rows).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("maps exhausted 429 retries to ApiFootballQuotaError when day quota is zero", async () => {
    vi.mocked(pRetry).mockImplementationOnce(async (fn) =>
      (fn as () => Promise<Response>)()
    );

    await recordQuotaFromHeaders(
      new Headers({
        "x-ratelimit-requests-remaining": "0",
      })
    );

    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse({}, { status: 429 }));

    await expect(
      apiFootballFetch(
        "/fixtures",
        { id: 1035037 },
        { fetchImpl, priority: "critical" }
      )
    ).rejects.toBeInstanceOf(ApiFootballQuotaError);
  });

  it("maps exhausted 429 retries to ApiFootballRateLimitError when day quota remains", async () => {
    vi.mocked(pRetry).mockImplementationOnce(async (fn) =>
      (fn as () => Promise<Response>)()
    );

    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        mockResponse({}, { status: 429, headers: { "Retry-After": "2" } })
      );

    await expect(
      apiFootballFetch(
        "/fixtures",
        { id: 1035037 },
        { fetchImpl, priority: "critical" }
      )
    ).rejects.toBeInstanceOf(ApiFootballRateLimitError);
  });

  it("accepts HTTP 200 with valid empty results", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse(
        {
          get: "fixtures/events",
          parameters: { fixture: 1 },
          errors: [],
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

    const outcome = await apiFootballFetchOutcome(
      "/fixtures/events",
      { fixture: 1 },
      { fetchImpl }
    );

    expect(outcome.kind).toBe("empty");
    expect(
      outcome.kind === "empty" || outcome.kind === "success"
        ? outcome.data.response
        : null
    ).toEqual([]);
  });

  it("rejects malformed JSON bodies as permanent failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-ratelimit-requests-remaining": "5000",
        },
      })
    );

    await expect(
      apiFootballFetch("/fixtures", { id: 1 }, { fetchImpl })
    ).rejects.toThrow(/not valid JSON/);
  });

  it("retries HTTP 500 and eventually succeeds", async () => {
    const fixture = loadApiFootballFixture("fixture-by-id.json");
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({}, { status: 500 }))
      .mockResolvedValueOnce(
        mockResponse(fixture, {
          headers: {
            "x-ratelimit-requests-remaining": "5000",
          },
        })
      );

    const result = await apiFootballFetch(
      "/fixtures",
      { id: 1035037 },
      { fetchImpl }
    );

    expect(result.response).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries request timeouts", async () => {
    const fixture = loadApiFootballFixture("fixture-by-id.json");
    const timeoutError = new DOMException(
      "The operation timed out.",
      "TimeoutError"
    );
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce(
        mockResponse(fixture, {
          headers: {
            "x-ratelimit-requests-remaining": "5000",
          },
        })
      );

    const result = await apiFootballFetch(
      "/fixtures",
      { id: 1035037 },
      { fetchImpl }
    );

    expect(result.response).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not return an empty array when the provider returns errors", async () => {
    const fixture = loadApiFootballFixture("ip-not-allowed.json");
    const fetchImpl = vi.fn().mockResolvedValue(mockResponse(fixture));

    await expect(
      apiFootballFetchResponse(
        "/fixtures/events",
        { fixture: 1570378 },
        { fetchImpl }
      )
    ).rejects.toBeInstanceOf(ApiFootballError);
  });
});

describe("parseRetryAfterMs", () => {
  it("parses Retry-After seconds", () => {
    expect(parseRetryAfterMs("2")).toBe(2000);
  });
});
