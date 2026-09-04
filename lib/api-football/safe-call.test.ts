import { describe, expect, it, vi } from "vitest";

import { ApiFootballError } from "@/lib/api-football/errors";
import { safeOptionalProviderFetch } from "@/lib/api-football/safe-call";

describe("safeOptionalProviderFetch", () => {
  it("returns the fetched value on success", async () => {
    await expect(
      safeOptionalProviderFetch("test", async () => ["player"], [])
    ).resolves.toEqual(["player"]);
  });

  it("returns fallback when provider errors", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      safeOptionalProviderFetch(
        "test",
        async () => {
          throw new ApiFootballError("API-Football provider returned errors", {
            path: "/teams/statistics",
          });
        },
        null
      )
    ).resolves.toBeNull();

    warnSpy.mockRestore();
  });

  it("returns fallback when the error name is ApiFootballError", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = new Error("API-Football provider returned errors");
    error.name = "ApiFootballError";

    await expect(
      safeOptionalProviderFetch(
        "test",
        async () => {
          throw error;
        },
        null
      )
    ).resolves.toBeNull();

    warnSpy.mockRestore();
  });

  it("rethrows unexpected errors", async () => {
    await expect(
      safeOptionalProviderFetch(
        "test",
        async () => {
          throw new Error("boom");
        },
        null
      )
    ).rejects.toThrow("boom");
  });
});
