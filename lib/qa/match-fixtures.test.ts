import { describe, expect, it } from "vitest";

import {
  findLiveFixtureWithData,
  findRichFtFixture,
} from "@/lib/qa/match-fixtures";
import { PINNED_MATCH_QA_FIXTURES } from "@/lib/qa/pinned-fixture-ids";
import type { FixtureCandidate } from "@/lib/qa/match-fixtures";

describe("PINNED_MATCH_QA_FIXTURES", () => {
  it("exposes stable provider ids", () => {
    expect(PINNED_MATCH_QA_FIXTURES.ftWithXg).toBe(1570355);
    expect(PINNED_MATCH_QA_FIXTURES.nsNoLineups).toBe(1552754);
  });
});

describe("findRichFtFixture", () => {
  it("prefers FT with stats and events", () => {
    const candidates: FixtureCandidate[] = [
      {
        provider_id: 1,
        status: "FT",
        stat_rows: 0,
        event_rows: 0,
        lineup_rows: 0,
      },
      {
        provider_id: 2,
        status: "FT",
        stat_rows: 2,
        event_rows: 5,
        lineup_rows: 2,
      },
    ];
    expect(findRichFtFixture(candidates)?.provider_id).toBe(2);
  });
});

describe("findLiveFixtureWithData", () => {
  it("requires live status and stats rows", () => {
    const candidates: FixtureCandidate[] = [
      {
        provider_id: 3,
        status: "1H",
        stat_rows: 2,
        event_rows: 1,
        lineup_rows: 0,
      },
      {
        provider_id: 4,
        status: "FT",
        stat_rows: 2,
        event_rows: 1,
        lineup_rows: 0,
      },
    ];
    expect(findLiveFixtureWithData(candidates)?.provider_id).toBe(3);
  });
});
