import { describe, expect, it } from "vitest";

import { scoreTextMatch } from "@/lib/search/score";

describe("scoreTextMatch", () => {
  it("ranks exact and prefix matches above partial matches", () => {
    const exact = scoreTextMatch({
      query: "real madrid",
      fields: ["Real Madrid"],
    });
    const prefix = scoreTextMatch({
      query: "real",
      fields: ["Real Madrid"],
    });
    const partial = scoreTextMatch({
      query: "madrid",
      fields: ["Real Madrid"],
    });

    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(partial);
  });

  it("matches multi-word queries across words", () => {
    const score = scoreTextMatch({
      query: "real sociedad",
      fields: ["Real Sociedad"],
    });
    expect(score).toBeGreaterThanOrEqual(100);
  });

  it("is case insensitive", () => {
    const lower = scoreTextMatch({
      query: "barcelona",
      fields: ["FC Barcelona"],
    });
    const upper = scoreTextMatch({
      query: "BARCELONA",
      fields: ["FC Barcelona"],
    });
    expect(lower).toBe(upper);
  });

  it("uses db similarity as fuzzy floor", () => {
    const score = scoreTextMatch({
      query: "mesi",
      fields: ["Lionel Messi"],
      dbSimilarity: 0.35,
    });
    expect(score).toBeGreaterThan(0);
  });
});
