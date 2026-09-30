import { describe, expect, it } from "vitest";

import {
  findCompetition,
  getCompetitionTier,
  getEnabledProviderIds,
  getPrimaryLeagueTabs,
  isEnabledCompetition,
} from "@/lib/competitions/index";
import {
  LEGACY_CORE_PROVIDER_IDS,
  PRIMARY_TAB_PROVIDER_IDS,
} from "@/lib/competitions/legacy";

describe("competition registry compatibility", () => {
  it("keeps all legacy core provider IDs enabled", () => {
    for (const providerId of LEGACY_CORE_PROVIDER_IDS) {
      expect(isEnabledCompetition(providerId)).toBe(true);
    }
  });

  it("preserves primary tab provider IDs and order", () => {
    const tabs = getPrimaryLeagueTabs();
    expect(tabs.map((tab) => tab.providerId)).toEqual([
      ...PRIMARY_TAB_PROVIDER_IDS,
    ]);
  });

  it("keeps legacy core at tier 1 except Super Liga (286) at tier 2", () => {
    for (const providerId of LEGACY_CORE_PROVIDER_IDS) {
      if (providerId === 286) {
        expect(getCompetitionTier(providerId)).toBe(2);
        continue;
      }
      expect(getCompetitionTier(providerId)).toBe(1);
    }
  });

  it("keeps Friendlies lineups enabled despite probe false-negative", () => {
    expect(findCompetition(10)?.capabilities.lineups).toBe(true);
  });

  it("enables a bounded sane registry size", () => {
    const enabled = getEnabledProviderIds();
    expect(enabled.length).toBeGreaterThan(150);
    expect(enabled.length).toBeLessThan(300);
  });
});
