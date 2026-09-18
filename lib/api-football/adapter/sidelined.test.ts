import { describe, expect, it } from "vitest";

import {
  classifySidelinedKind,
  mapFixtureSidelined,
} from "@/lib/api-football/adapter/sidelined";

describe("sidelined adapter", () => {
  it("classifies suspensions and injuries", () => {
    expect(classifySidelinedKind("Missing Fixture", "Suspended")).toBe(
      "suspension"
    );
    expect(classifySidelinedKind("Missing Fixture", "Muscle Injury")).toBe(
      "injury"
    );
  });

  it("maps provider rows", () => {
    const mapped = mapFixtureSidelined({
      player: {
        id: 1,
        name: "Player A",
        photo: null,
        type: "Missing Fixture",
        reason: "Knee Injury",
      },
      team: { id: 10, name: "Team", logo: null },
      fixture: { id: 99 },
      league: {
        id: 39,
        name: "Premier League",
        country: "England",
        logo: null,
        flag: null,
        season: 2024,
      },
    });

    expect(mapped.kind).toBe("injury");
    expect(mapped.teamExternalId).toBe(10);
  });
});
