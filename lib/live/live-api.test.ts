import { describe, expect, it } from "vitest";

import { parseLiveWatchBody, parseWatchTokenBody } from "@/lib/live/live-api";

describe("live-api", () => {
  it("parses match watch body", () => {
    const parsed = parseLiveWatchBody({
      surface: "match",
      fixtureProviderId: 1035037,
    });
    expect("error" in parsed).toBe(false);
    if (!("error" in parsed)) {
      expect(parsed.surface).toBe("match");
    }
  });

  it("parses live-center watch body", () => {
    const parsed = parseLiveWatchBody({ surface: "live-center" });
    expect("error" in parsed).toBe(false);
  });

  it("rejects invalid watch token", () => {
    const parsed = parseWatchTokenBody({ watchToken: "not-a-uuid" });
    expect("error" in parsed).toBe(true);
  });
});
