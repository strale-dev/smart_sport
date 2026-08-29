import { describe, expect, it } from "vitest";

import { waitlistSubscribeSchema } from "./schema";

describe("waitlistSubscribeSchema", () => {
  it("parses a valid payload and normalizes email", () => {
    const result = waitlistSubscribeSchema.parse({
      email: "  User@Example.com ",
      source: "landing_hero",
      utm_source: "twitter",
      utm_medium: "social",
      utm_campaign: "launch",
      referrer: "https://example.com",
    });

    expect(result.email).toBe("user@example.com");
    expect(result.source).toBe("landing_hero");
    expect(result.utm_source).toBe("twitter");
  });

  it("rejects invalid email", () => {
    const result = waitlistSubscribeSchema.safeParse({
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
  });

  it("treats empty optional strings as undefined", () => {
    const result = waitlistSubscribeSchema.parse({
      email: "user@example.com",
      source: "",
      utm_source: "   ",
    });

    expect(result.source).toBeUndefined();
    expect(result.utm_source).toBeUndefined();
  });
});
