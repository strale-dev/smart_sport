import { describe, expect, it } from "vitest";

import {
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

  it("enables a bounded sane registry size", () => {
    const enabled = getEnabledProviderIds();
    expect(enabled.length).toBeGreaterThan(50);
    expect(enabled.length).toBeLessThan(300);
  });
});
