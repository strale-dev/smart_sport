import { describe, expect, it } from "vitest";

import {
  addDaysToDateKey,
  buildTimezoneWindow,
  formatDateKeyInTimezone,
  formatDayLabelInTimezone,
  sanitizeTimezone,
  startOfDayUtcForTimezone,
} from "@/lib/datetime/timezone";

describe("sanitizeTimezone", () => {
  it("returns UTC for invalid timezones", () => {
    expect(sanitizeTimezone("Not/AZone")).toBe("UTC");
    expect(sanitizeTimezone("")).toBe("UTC");
    expect(sanitizeTimezone(null)).toBe("UTC");
  });

  it("keeps valid IANA timezones", () => {
    expect(sanitizeTimezone("Europe/Belgrade")).toBe("Europe/Belgrade");
  });
});

describe("formatDateKeyInTimezone", () => {
  it("buckets late UTC kickoffs into the next local day", () => {
    expect(
      formatDateKeyInTimezone("2026-09-02T23:30:00.000Z", "Europe/Belgrade")
    ).toBe("2026-09-03");
  });

  it("uses UTC when timezone is UTC", () => {
    expect(formatDateKeyInTimezone("2026-09-02T15:00:00.000Z", "UTC")).toBe(
      "2026-09-02"
    );
  });
});

describe("addDaysToDateKey", () => {
  it("adds calendar days", () => {
    expect(addDaysToDateKey("2026-09-02", 1)).toBe("2026-09-03");
    expect(addDaysToDateKey("2026-09-02", -1)).toBe("2026-09-01");
  });
});

describe("startOfDayUtcForTimezone", () => {
  it("returns midnight in the requested timezone as UTC", () => {
    const start = startOfDayUtcForTimezone("2026-09-02", "Europe/Belgrade");
    expect(formatDateKeyInTimezone(start, "Europe/Belgrade")).toBe(
      "2026-09-02"
    );
    expect(new Date(start).toISOString()).toBe("2026-09-01T22:00:00.000Z");
  });
});

describe("formatDayLabelInTimezone", () => {
  const now = new Date("2026-09-02T12:00:00.000Z");

  it("labels today and tomorrow in the user timezone", () => {
    expect(formatDayLabelInTimezone("2026-09-02", now, "UTC")).toBe("Today");
    expect(formatDayLabelInTimezone("2026-09-03", now, "UTC")).toBe("Tomorrow");
  });
});

describe("buildTimezoneWindow", () => {
  it("builds a -30/+365 day window around today in user timezone", () => {
    const now = new Date("2026-09-02T12:00:00.000Z");
    const window = buildTimezoneWindow(now, "UTC", 30, 365);

    expect(window.todayDateKey).toBe("2026-09-02");
    expect(window.fromUtc).toBe("2026-08-03T00:00:00.000Z");
    expect(window.toUtcExclusive).toBe("2027-09-03T00:00:00.000Z");
  });
});
