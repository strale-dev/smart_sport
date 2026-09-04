import { describe, expect, it } from "vitest";

import { buildPlayerContributionBadges } from "@/lib/players/badges";
import type { FixtureEvent } from "@/types/domain";

describe("buildPlayerContributionBadges", () => {
  it("builds goal and assist badges with minutes from events", () => {
    const events: FixtureEvent[] = [
      {
        externalEventId: "1",
        minute: 12,
        extraMinute: null,
        teamExternalId: 33,
        playerExternalId: 909,
        assistPlayerExternalId: null,
        type: "Goal",
        detail: "Normal Goal",
        comments: null,
      },
      {
        externalEventId: "2",
        minute: 55,
        extraMinute: null,
        teamExternalId: 33,
        playerExternalId: 909,
        assistPlayerExternalId: null,
        type: "Goal",
        detail: "Normal Goal",
        comments: null,
      },
      {
        externalEventId: "3",
        minute: 70,
        extraMinute: null,
        teamExternalId: 33,
        playerExternalId: 100,
        assistPlayerExternalId: 909,
        type: "Goal",
        detail: "Normal Goal",
        comments: null,
      },
    ];

    const badges = buildPlayerContributionBadges({
      goals: 2,
      assists: 1,
      yellowCards: 0,
      redCards: 0,
      cleanSheet: false,
      isMotm: true,
      events,
      playerExternalId: 909,
      position: "MF",
    });

    expect(badges).toEqual(
      expect.arrayContaining([
        { type: "goal", minute: 12 },
        { type: "goal", minute: 55 },
        { type: "assist", minute: 70 },
        { type: "motm", minute: null },
      ])
    );
  });

  it("falls back to count-based badges when events are missing", () => {
    const badges = buildPlayerContributionBadges({
      goals: 1,
      assists: 0,
      yellowCards: 1,
      redCards: 0,
      cleanSheet: true,
      isMotm: false,
      events: [],
      playerExternalId: 909,
      position: "DF",
    });

    expect(badges).toEqual([
      { type: "goal", minute: null },
      { type: "yellow_card", minute: null },
      { type: "clean_sheet", minute: null },
    ]);
  });
});
