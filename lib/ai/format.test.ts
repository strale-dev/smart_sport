import { describe, expect, it } from "vitest";

import {
  formatExpectedGoalsRange,
  formatRelativeTime,
  formatWinProbability,
  outcomeLabel,
} from "@/lib/ai/format";

describe("format helpers", () => {
  it("formats win probability as percent", () => {
    expect(formatWinProbability(0.543)).toBe("54%");
  });

  it("formats relative time", () => {
    const now = Date.parse("2026-01-01T12:00:00.000Z");
    expect(formatRelativeTime("2026-01-01T11:59:30.000Z", now)).toBe(
      "Updated 30s ago"
    );
  });

  it("formats outcome labels", () => {
    expect(outcomeLabel("1", { name: "Arsenal" }, { name: "Chelsea" })).toBe(
      "Arsenal win"
    );
    expect(outcomeLabel("X", { name: "Arsenal" }, { name: "Chelsea" })).toBe(
      "Draw"
    );
  });

  it("formats expected goals range", () => {
    expect(formatExpectedGoalsRange([2, 3])).toBe("2–3");
    expect(formatExpectedGoalsRange([2, 2])).toBe("2");
  });
});
