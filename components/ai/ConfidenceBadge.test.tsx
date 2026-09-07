import { describe, expect, it } from "vitest";

import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";

describe("ConfidenceBadge", () => {
  it("exports a component function", () => {
    expect(typeof ConfidenceBadge).toBe("function");
  });
});
