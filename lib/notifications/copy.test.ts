import { describe, expect, it } from "vitest";

import { buildNotificationCopy } from "@/lib/notifications/copy";

describe("buildNotificationCopy", () => {
  const teams = {
    homeName: "Arsenal",
    awayName: "Chelsea",
    fixtureProviderId: 1035037,
  };

  it("formats goal copy", () => {
    const copy = buildNotificationCopy("GOAL_FOR_FOLLOWED_TEAM", teams, {
      scoringTeamName: "Arsenal",
      minute: 67,
    });
    expect(copy.title).toContain("Arsenal");
    expect(copy.title).toContain("Chelsea");
    expect(copy.body).toContain("67");
  });

  it("formats full-time copy", () => {
    const copy = buildNotificationCopy("FULL_TIME_FOLLOWED_TEAM", teams);
    expect(copy.title).toMatch(/Full time/i);
  });
});
