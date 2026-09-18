import { describe, expect, it } from "vitest";

import {
  shouldFillTeamForm,
  shouldIngestLiveOrFinishedDetails,
  shouldIngestLineups,
} from "@/lib/match/overview-hydrate-policy";

describe("overview hydrate policy", () => {
  it("refreshes live match details when events or ratings are missing", () => {
    expect(
      shouldIngestLiveOrFinishedDetails({
        renderMode: "live",
        hasEvents: false,
        hasPlayerPerformances: true,
      })
    ).toBe(true);
    expect(
      shouldIngestLiveOrFinishedDetails({
        renderMode: "live",
        hasEvents: true,
        hasPlayerPerformances: true,
      })
    ).toBe(false);
  });

  it("ingests finished details when events or ratings are missing", () => {
    expect(
      shouldIngestLiveOrFinishedDetails({
        renderMode: "finished",
        hasEvents: false,
        hasPlayerPerformances: true,
      })
    ).toBe(true);
    expect(
      shouldIngestLiveOrFinishedDetails({
        renderMode: "finished",
        hasEvents: true,
        hasPlayerPerformances: false,
      })
    ).toBe(true);
    expect(
      shouldIngestLiveOrFinishedDetails({
        renderMode: "finished",
        hasEvents: true,
        hasPlayerPerformances: true,
      })
    ).toBe(false);
  });

  describe("shouldIngestLineups", () => {
    const kickoffAt = "2026-09-20T18:45:00.000Z";
    const kickoffMs = Date.parse(kickoffAt);

    it("skips fixtures that already have lineups", () => {
      expect(
        shouldIngestLineups({
          hasLineups: true,
          kickoffAt,
          now: kickoffMs,
        })
      ).toBe(false);
    });

    it("waits until lineups can plausibly exist", () => {
      expect(
        shouldIngestLineups({
          hasLineups: false,
          kickoffAt,
          now: kickoffMs - 5 * 60 * 60 * 1000,
        })
      ).toBe(false);
    });

    it("ingests once kickoff is within the publish window", () => {
      expect(
        shouldIngestLineups({
          hasLineups: false,
          kickoffAt,
          now: kickoffMs - 30 * 60 * 1000,
        })
      ).toBe(true);
    });

    it("ingests for live fixtures", () => {
      expect(
        shouldIngestLineups({
          hasLineups: false,
          kickoffAt,
          now: kickoffMs + 30 * 60 * 1000,
        })
      ).toBe(true);
    });

    it("ingests for finished fixtures, which the details call skips", () => {
      expect(
        shouldIngestLineups({
          hasLineups: false,
          kickoffAt,
          now: kickoffMs + 30 * 24 * 60 * 60 * 1000,
        })
      ).toBe(true);
    });
  });

  it("fills form when fewer than 3 finished matches exist", () => {
    expect(shouldFillTeamForm(0)).toBe(true);
    expect(shouldFillTeamForm(2)).toBe(true);
    expect(shouldFillTeamForm(3)).toBe(false);
  });
});
