import { describe, expect, it } from "vitest";

import {
  BACKFILL_MAX_SEASONS_PER_LEAGUE,
  resolveBackfillLeagueProviderIds,
} from "@/lib/ingestion/backfill-tiers";

describe("backfill tiers", () => {
  it("tier 1 includes primary tab leagues", () => {
    const ids = resolveBackfillLeagueProviderIds(1);
    expect(ids).toContain(39);
    expect(ids).toContain(2);
    expect(ids.length).toBeGreaterThan(0);
  });

  it("tier 2 does not duplicate tier 1 ids", () => {
    const tier1 = new Set(resolveBackfillLeagueProviderIds(1));
    const tier2 = resolveBackfillLeagueProviderIds(2);
    for (const id of tier2) {
      expect(tier1.has(id)).toBe(false);
    }
  });

  it("caps seasons constant at 15", () => {
    expect(BACKFILL_MAX_SEASONS_PER_LEAGUE).toBe(15);
  });
});
