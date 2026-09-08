import { describe, expect, it } from "vitest";

import {
  readViewerTimezoneCookie,
  resolveViewerTimezoneFromSources,
} from "@/lib/datetime/viewer-timezone";

describe("readViewerTimezoneCookie", () => {
  it("returns null for missing cookie", () => {
    expect(readViewerTimezoneCookie({})).toBeNull();
  });

  it("sanitizes encoded cookie values", () => {
    expect(
      readViewerTimezoneCookie({
        viewer_timezone: encodeURIComponent("Europe/Belgrade"),
      })
    ).toBe("Europe/Belgrade");
  });
});

describe("resolveViewerTimezoneFromSources", () => {
  it("prefers a non-UTC profile timezone for logged-in users", () => {
    expect(
      resolveViewerTimezoneFromSources({
        userId: "user-1",
        profileTimeZone: "Europe/Belgrade",
        cookieTimeZone: "America/New_York",
      })
    ).toBe("Europe/Belgrade");
  });

  it("falls back to cookie timezone when profile is UTC", () => {
    expect(
      resolveViewerTimezoneFromSources({
        userId: "user-1",
        profileTimeZone: "UTC",
        cookieTimeZone: "Europe/Belgrade",
      })
    ).toBe("Europe/Belgrade");
  });

  it("uses cookie timezone for guests", () => {
    expect(
      resolveViewerTimezoneFromSources({
        userId: null,
        cookieTimeZone: "Europe/Belgrade",
      })
    ).toBe("Europe/Belgrade");
  });
});
