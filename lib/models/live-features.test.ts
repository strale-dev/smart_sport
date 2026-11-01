import { describe, expect, it } from "vitest";

import { buildLiveFeaturesFromSnapshot } from "@/lib/models/live-features";
import type { LiveDetectorSnapshot } from "@/lib/live/event-detector-types";

const anchor = { home: 0.5, draw: 0.25, away: 0.25 };

function snapshot(
  partial: Partial<LiveDetectorSnapshot["score"]> = {}
): LiveDetectorSnapshot {
  return {
    fixtureProviderId: 99,
    capturedAt: "2026-10-11T12:00:00.000Z",
    minute: 10,
    status: "1H",
    homeTeamExternalId: 1,
    awayTeamExternalId: 2,
    score: {
      home: 0,
      away: 0,
      ...partial,
    },
    stats: [],
    events: [],
    starterExternalIds: [],
  };
}

describe("buildLiveFeaturesFromSnapshot", () => {
  it("returns null when either score is missing", () => {
    expect(
      buildLiveFeaturesFromSnapshot(snapshot({ home: null, away: 0 }), anchor)
    ).toBeNull();
    expect(
      buildLiveFeaturesFromSnapshot(snapshot({ home: 1, away: null }), anchor)
    ).toBeNull();
  });

  it("preserves non-null scores without coercing to zero", () => {
    const features = buildLiveFeaturesFromSnapshot(
      snapshot({ home: 2, away: 1 }),
      anchor
    );
    expect(features).toMatchObject({ scoreHome: 2, scoreAway: 1 });
  });
});
