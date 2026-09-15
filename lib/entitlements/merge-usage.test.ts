import { describe, expect, it } from "vitest";

import { mergeAiUsageRows } from "@/lib/entitlements/merge-usage";

describe("mergeAiUsageRows", () => {
  it("uses max numeric counters and unions live fixtures", () => {
    const merged = mergeAiUsageRows(
      {
        ai_predictions_count: 5,
        ai_deep_analyses_count: 1,
        ai_generations_count: 6,
        live_ai_matches: ["b"],
        last_live_ai_at: {
          b: "2026-09-15T12:00:00.000Z",
        },
      },
      {
        ai_predictions_count: 2,
        ai_deep_analyses_count: 3,
        ai_generations_count: 4,
        live_ai_matches: ["a"],
        last_live_ai_at: {
          a: "2026-09-15T11:00:00.000Z",
          b: "2026-09-15T10:00:00.000Z",
        },
      }
    );

    expect(merged.ai_predictions_count).toBe(5);
    expect(merged.ai_deep_analyses_count).toBe(3);
    expect(merged.ai_generations_count).toBe(6);
    expect(merged.live_ai_matches.sort()).toEqual(["a", "b"]);
    expect(merged.last_live_ai_at.b).toBe("2026-09-15T12:00:00.000Z");
  });
});
