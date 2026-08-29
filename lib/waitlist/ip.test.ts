import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { getClientIp, hashEmail, hashIp, hashValue } from "./ip";

describe("waitlist ip helpers", () => {
  it("hashes values deterministically", () => {
    expect(hashValue("test")).toBe(hashValue("test"));
    expect(hashIp("127.0.0.1")).toBe(hashValue("127.0.0.1"));
    expect(hashEmail("User@Example.com")).toBe(hashValue("user@example.com"));
  });

  it("extracts the first IP from x-forwarded-for", () => {
    const request = new NextRequest("http://localhost/api/waitlist/subscribe", {
      headers: {
        "x-forwarded-for": "203.0.113.1, 10.0.0.1",
      },
    });

    expect(getClientIp(request)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const request = new NextRequest("http://localhost/api/waitlist/subscribe", {
      headers: {
        "x-real-ip": "198.51.100.10",
      },
    });

    expect(getClientIp(request)).toBe("198.51.100.10");
  });

  it("returns null when no IP headers are present", () => {
    const request = new NextRequest("http://localhost/api/waitlist/subscribe");

    expect(getClientIp(request)).toBeNull();
  });
});
