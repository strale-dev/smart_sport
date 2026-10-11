import { beforeEach, describe, expect, it } from "vitest";

import type { DetectedMeaningfulEvent } from "@/lib/live/event-detector-types";
import {
  LIVE_INSIGHT_SOFT_MIN_INTERVAL_MS,
  evaluateLiveInsightGenerationGate,
  eventDedupeKey,
  markLiveInsightGenerationSuccess,
  resetLiveInsightGenerationGateMemoryForTests,
} from "@/lib/live/live-insight-generation-gate";

describe("live-insight-generation-gate", () => {
  beforeEach(() => {
    resetLiveInsightGenerationGateMemoryForTests();
  });

  it("dedupes replayed events with the same external id", async () => {
    const events: DetectedMeaningfulEvent[] = [
      {
        kind: "GOAL",
        reason: "goal_event",
        minute: 55,
        teamExternalId: 33,
        externalEventId: "goal-1",
      },
    ];

    await markLiveInsightGenerationSuccess({
      fixtureProviderId: 1,
      events,
    });

    const gate = await evaluateLiveInsightGenerationGate({
      fixtureProviderId: 1,
      events,
      triggerKinds: ["GOAL"],
    });

    expect(gate).toEqual({ allow: false, reason: "EVENTS_ALREADY_PROCESSED" });
  });

  it("applies soft interval only to periodic or probability-shift-only triggers", async () => {
    const now = 1_700_000_000_000;
    await markLiveInsightGenerationSuccess({
      fixtureProviderId: 2,
      events: [],
      now,
    });

    const blocked = await evaluateLiveInsightGenerationGate({
      fixtureProviderId: 2,
      events: [
        {
          kind: "PERIODIC",
          reason: "periodic",
          minute: 70,
          teamExternalId: null,
        },
      ],
      triggerKinds: ["PERIODIC"],
      now: now + LIVE_INSIGHT_SOFT_MIN_INTERVAL_MS - 1,
    });
    expect(blocked).toEqual({ allow: false, reason: "SOFT_MIN_INTERVAL" });

    const allowed = await evaluateLiveInsightGenerationGate({
      fixtureProviderId: 2,
      events: [
        {
          kind: "GOAL",
          reason: "goal_event",
          minute: 71,
          teamExternalId: 33,
          externalEventId: "goal-new",
        },
      ],
      triggerKinds: ["GOAL"],
      now: now + 1_000,
    });
    expect(allowed).toEqual({ allow: true });
  });

  it("builds stable dedupe keys for status transitions", () => {
    const key = eventDedupeKey({
      kind: "FT",
      reason: "live_to_finished",
      minute: 90,
      teamExternalId: null,
      meta: { fromStatus: "2H", toStatus: "FT" },
    });
    expect(key).toBe("state:2H->FT");
  });
});
