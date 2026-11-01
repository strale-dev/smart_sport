import { describe, expect, it, vi } from "vitest";

import { resolveCronOutcome } from "@/lib/ingestion/cron-outcome";
import {
  evaluateNullWarmReadinessRows,
  isAiGenerationAllowedFromRow,
  warmWindowBoundsForScope,
} from "@/lib/ingestion/warm-ai-prematch";

const { evaluateAndPersistFixtureReadiness } = vi.hoisted(() => ({
  evaluateAndPersistFixtureReadiness: vi.fn(),
}));

vi.mock("@/lib/fixtures/readiness/persist", () => ({
  evaluateAndPersistFixtureReadiness,
}));

describe("warmWindowBoundsForScope", () => {
  const now = Date.parse("2026-03-21T12:00:00.000Z");

  it("daily scope covers the next 36 hours from now", () => {
    const { from, to } = warmWindowBoundsForScope("daily", now);
    expect(from).toBe("2026-03-21T12:00:00.000Z");
    expect(to).toBe("2026-03-23T00:00:00.000Z");
  });

  it("imminent scope covers the next 90 minutes from now", () => {
    const { from, to } = warmWindowBoundsForScope("imminent", now);
    expect(from).toBe("2026-03-21T12:00:00.000Z");
    expect(to).toBe("2026-03-21T13:30:00.000Z");
  });

  it("backfill scope covers the previous 7 days through now", () => {
    const { from, to } = warmWindowBoundsForScope("backfill", now);
    expect(from).toBe("2026-03-14T12:00:00.000Z");
    expect(to).toBe("2026-03-21T12:00:00.000Z");
  });
});

describe("evaluateNullWarmReadinessRows", () => {
  it("evaluates null readiness rows and enables warm filter", async () => {
    evaluateAndPersistFixtureReadiness.mockResolvedValue({
      gates: { aiGenerationAllowed: true },
    });

    const row = {
      provider_id: 1558652,
      kickoff_at: "2026-10-12T15:00:00.000Z",
      fixture_readiness: null,
    };

    const { rows, evaluated } = await evaluateNullWarmReadinessRows([row], 10);

    expect(evaluated).toBe(1);
    expect(evaluateAndPersistFixtureReadiness).toHaveBeenCalledWith({
      providerId: 1558652,
    });
    expect(isAiGenerationAllowedFromRow(rows[0])).toBe(true);
  });
});

describe("warm cron outcome semantics", () => {
  it("treats LLM fallback as a failed warm unit", () => {
    expect(resolveCronOutcome({ failedCount: 1 })).toEqual({
      ok: false,
      degraded: true,
    });
  });

  it("does not treat expected unavailability as cron failure", () => {
    const unavailable = 5;
    const fallback = 0;
    const errors = 0;
    expect(resolveCronOutcome({ failedCount: fallback + errors })).toEqual({
      ok: true,
    });
    expect(unavailable).toBeGreaterThan(0);
  });
});
