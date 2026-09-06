import { describe, expect, it } from "vitest";

import { computeContextHash, stableStringify } from "@/lib/ai/hash";

describe("ai hash helpers", () => {
  it("produces stable JSON regardless of key order", () => {
    const left = stableStringify({ b: 2, a: { d: 4, c: 3 } });
    const right = stableStringify({ a: { c: 3, d: 4 }, b: 2 });
    expect(left).toBe(right);
  });

  it("changes hash when meaningful context changes", () => {
    const base = {
      fixtureExternalId: 123,
      modelVersion: "1.0.0",
      promptVersion: "1.0.0",
      lineupsState: "MISSING",
    };

    const first = computeContextHash(base);
    const second = computeContextHash({
      ...base,
      lineupsState: "CONFIRMED",
    });

    expect(first).not.toBe(second);
  });
});
