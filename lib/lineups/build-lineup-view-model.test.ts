import { describe, expect, it } from "vitest";

import {
  buildLineupViewModel,
  lineupViewModelHasContent,
  lineupViewModelHasPitchContent,
} from "@/lib/lineups/build-lineup-view-model";
import type { Fixture } from "@/types/domain";

const fixture = {
  externalId: 1,
  homeTeam: { externalId: 10, name: "Home FC", code: "HOM", logoUrl: null },
  awayTeam: { externalId: 20, name: "Away FC", code: "AWY", logoUrl: null },
} as Fixture;

describe("buildLineupViewModel", () => {
  it("merges ratings, captain, and goal badges", () => {
    const model = buildLineupViewModel({
      fixture: { ...fixture, status: "FT" } as Fixture,
      lineups: [
        {
          teamExternalId: 10,
          formation: "4-3-3",
          coachName: "Coach A",
          coachPhotoUrl: "https://example.com/coach.png",
          isConfirmed: true,
          players: [
            {
              playerExternalId: 100,
              name: "Striker",
              shirtNumber: 9,
              position: "F",
              grid: "5:3",
              isStarting: true,
              isCaptain: false,
              photoUrl: "https://example.com/9.png",
            },
          ],
        },
      ],
      performances: [
        {
          teamExternalId: 10,
          playerExternalId: 100,
          name: "Striker",
          shirtNumber: 9,
          position: "F",
          minutes: 90,
          rating: 8.2,
          goals: 2,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          saves: null,
          shotsTotal: 4,
          shotsOnTarget: 3,
          passes: 20,
          keyPasses: 1,
          wasStarter: true,
          wasCaptain: true,
        },
      ],
      events: [
        {
          externalEventId: "g1",
          minute: 12,
          extraMinute: null,
          teamExternalId: 10,
          playerExternalId: 100,
          assistPlayerExternalId: null,
          type: "Goal",
          detail: "Normal Goal",
          comments: null,
        },
        {
          externalEventId: "g2",
          minute: 55,
          extraMinute: null,
          teamExternalId: 10,
          playerExternalId: 100,
          assistPlayerExternalId: null,
          type: "Goal",
          detail: "Normal Goal",
          comments: null,
        },
      ],
      sidelined: [
        {
          teamExternalId: 10,
          playerExternalId: 200,
          name: "Injured One",
          kind: "injury",
          reason: "Knee",
        },
        {
          teamExternalId: 10,
          playerExternalId: 201,
          name: "Banned One",
          kind: "suspension",
          reason: "Red card",
        },
      ],
    });

    expect(model.statusLabel).toBe("Lineups");
    expect(model.home?.starters[0]?.rating).toBe(8.2);
    expect(model.home?.starters[0]?.isCaptain).toBe(true);
    expect(model.home?.starters[0]?.matchBadges.goals).toBe(2);
    expect(model.home?.injured).toHaveLength(1);
    expect(model.home?.suspended).toHaveLength(1);
    expect(lineupViewModelHasContent(model)).toBe(true);
  });

  it("uses possible lineups label before kickoff even with lineup rows", () => {
    const model = buildLineupViewModel({
      fixture: { ...fixture, status: "NS" } as Fixture,
      lineups: [
        {
          teamExternalId: 10,
          formation: "4-3-3",
          coachName: null,
          isConfirmed: true,
          players: [
            {
              playerExternalId: 1,
              name: "A",
              shirtNumber: 1,
              position: "G",
              grid: "1:3",
              isStarting: true,
              isCaptain: false,
            },
          ],
        },
      ],
      performances: [],
      events: [],
      sidelined: [],
    });

    expect(model.statusLabel).toBe("Possible lineups");
  });

  it("uses lineups label after kickoff", () => {
    const model = buildLineupViewModel({
      fixture: { ...fixture, status: "FT" } as Fixture,
      lineups: [
        {
          teamExternalId: 10,
          formation: null,
          coachName: null,
          isConfirmed: true,
          players: [
            {
              playerExternalId: 1,
              name: "A",
              shirtNumber: 1,
              position: "G",
              grid: "1:3",
              isStarting: true,
              isCaptain: false,
            },
          ],
        },
      ],
      performances: [],
      events: [],
      sidelined: [],
    });

    expect(model.statusLabel).toBe("Lineups");
  });

  it("counts sidelined-only as displayable content", () => {
    const model = buildLineupViewModel({
      fixture,
      lineups: [],
      performances: [],
      events: [],
      sidelined: [
        {
          teamExternalId: 10,
          playerExternalId: 2,
          name: "Out",
          kind: "injury",
          reason: "Knee",
        },
      ],
    });

    expect(lineupViewModelHasPitchContent(model)).toBe(false);
    expect(lineupViewModelHasContent(model, [])).toBe(false);
    expect(
      lineupViewModelHasContent(model, [
        {
          teamExternalId: 10,
          playerExternalId: 2,
          name: "Out",
          kind: "injury",
          reason: "Knee",
        },
      ])
    ).toBe(true);
  });
});
