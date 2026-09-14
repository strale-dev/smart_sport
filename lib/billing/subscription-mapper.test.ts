import { describe, expect, it } from "vitest";

import {
  mapLemonStatusToDb,
  resolveTierFromSubscription,
} from "@/lib/billing/subscription-mapper";

describe("subscription-mapper", () => {
  it("maps lemon statuses to db enum", () => {
    expect(mapLemonStatusToDb("on_trial")).toBe("TRIALING");
    expect(mapLemonStatusToDb("active")).toBe("ACTIVE");
    expect(mapLemonStatusToDb("expired")).toBe("EXPIRED");
  });

  it("keeps premium during cancelled grace period", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      resolveTierFromSubscription({
        status: "CANCELLED",
        endsAt: future,
        trialEndsAt: null,
      })
    ).toBe("PREMIUM");
  });

  it("downgrades to free when subscription expired", () => {
    expect(
      resolveTierFromSubscription({
        status: "EXPIRED",
        endsAt: null,
        trialEndsAt: null,
      })
    ).toBe("FREE");
  });
});
