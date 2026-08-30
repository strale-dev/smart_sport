import { describe, expect, it } from "vitest";

import { normalizeEnvValue } from "@/lib/env/load-local";

describe("normalizeEnvValue", () => {
  it("strips double quotes", () => {
    expect(normalizeEnvValue('"https://example.upstash.io"')).toBe(
      "https://example.upstash.io"
    );
  });

  it("strips single quotes", () => {
    expect(normalizeEnvValue("'token-value'")).toBe("token-value");
  });

  it("trims whitespace", () => {
    expect(normalizeEnvValue("  plain-value  ")).toBe("plain-value");
  });

  it("strips carriage returns from Windows env files", () => {
    expect(normalizeEnvValue("token-value\r")).toBe("token-value");
  });
});
