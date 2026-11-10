import { describe, expect, it } from "vitest";

import { isDynamicServerUsageError } from "@/lib/supabase/dynamic-server-error";

describe("isDynamicServerUsageError", () => {
  it("returns true for DYNAMIC_SERVER_USAGE digest", () => {
    expect(
      isDynamicServerUsageError({
        digest: "DYNAMIC_SERVER_USAGE",
        message: "Dynamic server usage: Route /x used cookies",
      })
    ).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isDynamicServerUsageError(new Error("network"))).toBe(false);
  });
});
