import { describe, expect, it } from "vitest";

import {
  isTrialEndingOnReminderDayUtc,
  trialEndingReminderWindowUtc,
} from "@/lib/emails/trial-ending-window";

describe("trialEndingReminderWindowUtc", () => {
  it("targets calendar day three days after reference (UTC)", () => {
    const reference = new Date("2026-03-10T15:30:00Z");
    const { windowStart, windowEnd } = trialEndingReminderWindowUtc(reference);

    expect(windowStart.toISOString()).toBe("2026-03-13T00:00:00.000Z");
    expect(windowEnd.toISOString()).toBe("2026-03-14T00:00:00.000Z");
  });
});

describe("isTrialEndingOnReminderDayUtc", () => {
  const reference = new Date("2026-03-10T12:00:00Z");

  it("returns true when trial ends on reminder day", () => {
    expect(
      isTrialEndingOnReminderDayUtc("2026-03-13T18:00:00Z", reference)
    ).toBe(true);
  });

  it("returns false when trial ends two days out", () => {
    expect(
      isTrialEndingOnReminderDayUtc("2026-03-12T18:00:00Z", reference)
    ).toBe(false);
  });

  it("returns false for invalid iso", () => {
    expect(isTrialEndingOnReminderDayUtc("not-a-date", reference)).toBe(false);
  });
});
