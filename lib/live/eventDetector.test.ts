import { describe, expect, it } from "vitest";

import type {
  LiveDetectorSnapshot,
  SnapshotEvent,
} from "@/lib/live/event-detector-types";
import {
  detectMeaningfulEvents,
  isRedCardDetail,
  toMeaningfulEventBroadcastPayload,
} from "@/lib/live/eventDetector";

function event(
  partial: Partial<SnapshotEvent> &
    Pick<SnapshotEvent, "externalEventId" | "type">
): SnapshotEvent {
  return {
    detail: null,
    comments: null,
    minute: 10,
    teamExternalId: 33,
    playerExternalId: 1,
    assistPlayerExternalId: null,
    ...partial,
  };
}

function snapshot(
  partial: Partial<LiveDetectorSnapshot> &
    Pick<LiveDetectorSnapshot, "fixtureProviderId">
): LiveDetectorSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    status: "2H",
    minute: 45,
    homeTeamExternalId: 33,
    awayTeamExternalId: 34,
    score: { home: 0, away: 0 },
    events: [],
    stats: [],
    starterExternalIds: [],
    ...partial,
  };
}

describe("detectMeaningfulEvents", () => {
  it("returns no events on first tick (null prev)", () => {
    const next = snapshot({ fixtureProviderId: 1 });
    expect(detectMeaningfulEvents(null, next)).toEqual({ events: [] });
  });

  it("detects second yellow as RED_CARD", () => {
    const prev = snapshot({
      fixtureProviderId: 1,
      events: [],
    });
    const next = snapshot({
      fixtureProviderId: 1,
      events: [
        event({
          externalEventId: "card-1",
          type: "Card",
          detail: "Second Yellow card",
          minute: 55,
        }),
      ],
    });

    const result = detectMeaningfulEvents(prev, next);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.kind).toBe("RED_CARD");
  });

  it("prefers red card event over stat fallback in the same tick", () => {
    const prev = snapshot({
      fixtureProviderId: 1,
      stats: [{ teamExternalId: 33, expectedGoals: 0.5, redCards: 0 }],
    });
    const next = snapshot({
      fixtureProviderId: 1,
      events: [
        event({
          externalEventId: "card-red",
          type: "Card",
          detail: "Red Card",
          minute: 60,
        }),
      ],
      stats: [{ teamExternalId: 33, expectedGoals: 0.5, redCards: 1 }],
    });

    const result = detectMeaningfulEvents(prev, next);
    const redCards = result.events.filter((entry) => entry.kind === "RED_CARD");
    expect(redCards).toHaveLength(1);
    expect(redCards[0]?.externalEventId).toBe("card-red");
  });

  it("emits multiple kinds in the same tick without collapsing", () => {
    const prev = snapshot({
      fixtureProviderId: 1,
      score: { home: 0, away: 0 },
      stats: [
        { teamExternalId: 33, expectedGoals: 0.2, redCards: 0 },
        { teamExternalId: 34, expectedGoals: 0.1, redCards: 0 },
      ],
    });
    const next = snapshot({
      fixtureProviderId: 1,
      score: { home: 1, away: 0 },
      events: [
        event({
          externalEventId: "goal-1",
          type: "Goal",
          detail: "Normal Goal",
          minute: 50,
        }),
      ],
      stats: [
        { teamExternalId: 33, expectedGoals: 0.9, redCards: 0 },
        { teamExternalId: 34, expectedGoals: 0.1, redCards: 0 },
      ],
    });

    const result = detectMeaningfulEvents(prev, next);
    const kinds = result.events.map((entry) => entry.kind);
    expect(kinds).toContain("GOAL");
    expect(kinds).toContain("XG_DELTA");
    expect(result.events.filter((entry) => entry.kind === "GOAL")).toHaveLength(
      1
    );
  });

  it("reports score mismatch and adds score_diff_fallback goals", () => {
    const prev = snapshot({
      fixtureProviderId: 1,
      score: { home: 1, away: 0 },
    });
    const next = snapshot({
      fixtureProviderId: 1,
      score: { home: 3, away: 0 },
      events: [
        event({
          externalEventId: "goal-only",
          type: "Goal",
          detail: "Normal Goal",
          minute: 70,
        }),
      ],
    });

    const result = detectMeaningfulEvents(prev, next);
    expect(result.scoreGoalMismatch).toEqual({
      totalScoreDelta: 2,
      newGoalEventCount: 1,
    });

    const goals = result.events.filter((entry) => entry.kind === "GOAL");
    expect(goals).toHaveLength(2);
    expect(goals.some((entry) => entry.reason === "score_diff_fallback")).toBe(
      true
    );
  });

  it("skips xG delta when prior snapshot had no xG values", () => {
    const prev = snapshot({
      fixtureProviderId: 1,
      stats: [
        { teamExternalId: 33, expectedGoals: null, redCards: 0 },
        { teamExternalId: 34, expectedGoals: null, redCards: 0 },
      ],
    });
    const next = snapshot({
      fixtureProviderId: 1,
      stats: [
        { teamExternalId: 33, expectedGoals: 1.2, redCards: 0 },
        { teamExternalId: 34, expectedGoals: 0.3, redCards: 0 },
      ],
    });

    const result = detectMeaningfulEvents(prev, next);
    expect(result.events.some((entry) => entry.kind === "XG_DELTA")).toBe(
      false
    );
  });

  it("detects significant substitution for starter off before minute 70", () => {
    const prev = snapshot({
      fixtureProviderId: 1,
      starterExternalIds: [909],
    });
    const next = snapshot({
      fixtureProviderId: 1,
      starterExternalIds: [909],
      events: [
        event({
          externalEventId: "sub-1",
          type: "subst",
          detail: "Substitution 1",
          minute: 65,
          playerExternalId: 100,
          assistPlayerExternalId: 909,
        }),
      ],
    });

    const result = detectMeaningfulEvents(prev, next);
    expect(
      result.events.some((entry) => entry.kind === "SIGNIFICANT_SUBSTITUTION")
    ).toBe(true);
  });

  it("ignores substitution at minute 80 even for starters", () => {
    const prev = snapshot({ fixtureProviderId: 1, starterExternalIds: [909] });
    const next = snapshot({
      fixtureProviderId: 1,
      starterExternalIds: [909],
      events: [
        event({
          externalEventId: "sub-late",
          type: "subst",
          minute: 80,
          assistPlayerExternalId: 909,
        }),
      ],
    });

    const result = detectMeaningfulEvents(prev, next);
    expect(
      result.events.some((entry) => entry.kind === "SIGNIFICANT_SUBSTITUTION")
    ).toBe(false);
  });

  it("detects penalty goal and VAR penalty as PENALTY plus GOAL for scored penalty", () => {
    const prev = snapshot({ fixtureProviderId: 1 });
    const next = snapshot({
      fixtureProviderId: 1,
      score: { home: 1, away: 0 },
      events: [
        event({
          externalEventId: "pen-goal",
          type: "Goal",
          detail: "Penalty",
          minute: 12,
        }),
        event({
          externalEventId: "var-pen",
          type: "Var",
          detail: "Penalty confirmed",
          minute: 11,
          comments: null,
        }),
      ],
    });

    const result = detectMeaningfulEvents(prev, next);
    const kinds = result.events.map((entry) => entry.kind);
    expect(kinds.filter((kind) => kind === "PENALTY")).toHaveLength(2);
    expect(kinds).toContain("GOAL");
  });

  it("maps detected events to broadcast payload shape", () => {
    const mapped = toMeaningfulEventBroadcastPayload({
      kind: "GOAL",
      reason: "goal_event",
      minute: 10,
      teamExternalId: 33,
      externalEventId: "g1",
    });

    expect(mapped).toEqual({
      kind: "GOAL",
      minute: 10,
      teamExternalId: 33,
      reason: "goal_event",
      externalEventId: "g1",
      meta: undefined,
    });
  });
});

describe("isRedCardDetail", () => {
  it("matches red and second yellow variants", () => {
    expect(isRedCardDetail("Red Card")).toBe(true);
    expect(isRedCardDetail("Second Yellow card")).toBe(true);
    expect(isRedCardDetail("Yellow Card")).toBe(false);
  });
});

describe("fixture replay style diff", () => {
  it("detects a newly added goal from a second snapshot", () => {
    const prev = snapshot({
      fixtureProviderId: 1035037,
      score: { home: 0, away: 0 },
      events: [],
    });
    const next = snapshot({
      fixtureProviderId: 1035037,
      score: { home: 1, away: 0 },
      events: [
        event({
          externalEventId: "1035037:87:Goal:33:909",
          type: "Goal",
          detail: "Normal Goal",
          minute: 87,
          teamExternalId: 33,
          playerExternalId: 909,
          assistPlayerExternalId: 1485,
        }),
      ],
    });

    const result = detectMeaningfulEvents(prev, next);
    expect(result.events.some((entry) => entry.kind === "GOAL")).toBe(true);
  });
});
