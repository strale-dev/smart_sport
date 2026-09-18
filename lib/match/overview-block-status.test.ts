import { describe, expect, it } from "vitest";

import {
  EMPTY_HYDRATE_REPORT,
  getUnavailableOverviewCards,
} from "@/lib/match/overview-block-status";

describe("getUnavailableOverviewCards", () => {
  it("marks nothing unavailable when hydration succeeded", () => {
    expect(getUnavailableOverviewCards(EMPTY_HYDRATE_REPORT).size).toBe(0);
  });

  it("maps a failed match-details call to every block it feeds", () => {
    const cards = getUnavailableOverviewCards({
      failedGroups: ["matchDetails"],
    });

    expect([...cards].sort()).toEqual([
      "momentum",
      "playerOfMatch",
      "playersToWatch",
      "timeline",
    ]);
  });

  it("keeps unrelated blocks available when one group fails", () => {
    const cards = getUnavailableOverviewCards({ failedGroups: ["standings"] });

    expect(cards.has("standingsSnippet")).toBe(true);
    expect(cards.has("timeline")).toBe(false);
    expect(cards.has("formPreview")).toBe(false);
  });
});
