import { describe, expect, it } from "vitest";

import {
  fetchFixtureResource,
  shouldPersistResourceWrite,
} from "@/lib/ingestion/fixture-resource-fetch";

describe("shouldPersistResourceWrite", () => {
  it("allows writes when rows are present", () => {
    expect(shouldPersistResourceWrite("NOT_YET_AVAILABLE", 2)).toBe(true);
  });

  it("skips destructive empty writes before data exists", () => {
    expect(shouldPersistResourceWrite("NOT_YET_AVAILABLE", 0)).toBe(false);
  });

  it("allows persisting confirmed empty provider responses", () => {
    expect(shouldPersistResourceWrite("PROVIDER_RETURNED_NO_DATA", 0)).toBe(
      true
    );
  });
});

describe("fetchFixtureResource", () => {
  it("returns SKIPPED when competition does not support the resource", async () => {
    const result = await fetchFixtureResource(
      "fixture 1 statistics",
      "statistics",
      {
        fixtureStatus: "FT",
        kickoffAt: "2026-10-01T15:00:00.000Z",
        supported: false,
      },
      async () => []
    );
    expect(result.outcome).toBe("SKIPPED");
  });

  it("maps provider failures to retryable outcomes when appropriate", async () => {
    const result = await fetchFixtureResource(
      "fixture 1 events",
      "events",
      {
        fixtureStatus: "FT",
        kickoffAt: "2026-10-01T15:00:00.000Z",
        supported: true,
      },
      async () => {
        throw Object.assign(new Error("API-Football rate limit"), {
          name: "ApiFootballRateLimitError",
        });
      }
    );
    expect(result.outcome).toBe("RETRYABLE_FAILURE");
  });
});
