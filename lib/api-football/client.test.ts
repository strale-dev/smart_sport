import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFootballFetch } from "@/lib/api-football/client";
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
});
