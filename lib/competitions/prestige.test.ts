import { describe, expect, it } from "vitest";

import { getCompetitionRegistry } from "@/lib/competitions/index";
import {
  LEGACY_LEAGUE_PRESTIGE_SCORE,
  resolveTargetPrestigeScore,
  TIER_DEFAULT_PRESTIGE_SCORE,
} from "@/lib/competitions/prestige";
import { LEGACY_CORE_PROVIDER_IDS } from "@/lib/competitions/legacy";

describe("resolveTargetPrestigeScore", () => {
  it("keeps explicit legacy prestige scores", () => {
    for (const providerId of LEGACY_CORE_PROVIDER_IDS) {
      expect(
        resolveTargetPrestigeScore({
          providerId,
          tier: 2,
          existingScore: 0,
        })
      ).toBe(LEGACY_LEAGUE_PRESTIGE_SCORE[providerId]);
    }
  });

  it("never lowers legacy prestige below explicit map when DB is higher", () => {
    expect(
      resolveTargetPrestigeScore({
        providerId: 39,
        tier: 1,
        existingScore: 99,
      })
    ).toBe(99);
  });

  it("maps registry tiers to default prestige bands", () => {
    expect(
      resolveTargetPrestigeScore({
        providerId: 71,
        tier: 1,
        existingScore: null,
      })
    ).toBe(TIER_DEFAULT_PRESTIGE_SCORE[1]);

    expect(
      resolveTargetPrestigeScore({
        providerId: 999_001,
        tier: 2,
        existingScore: 0,
      })
    ).toBe(TIER_DEFAULT_PRESTIGE_SCORE[2]);

    expect(
      resolveTargetPrestigeScore({
        providerId: 999_002,
        tier: 3,
        existingScore: null,
      })
    ).toBe(TIER_DEFAULT_PRESTIGE_SCORE[3]);
  });

  it("does not lower a non-legacy score above the tier default", () => {
    expect(
      resolveTargetPrestigeScore({
        providerId: 71,
        tier: 2,
        existingScore: 80,
      })
    ).toBe(80);
  });
});

describe("registry tier prestige alignment", () => {
  it("gives tier 2 defaults at or above dashboard pool prestige threshold", () => {
    const tier2 = getCompetitionRegistry().filter((item) => item.tier === 2);
    expect(tier2.length).toBeGreaterThan(0);

    for (const competition of tier2.slice(0, 5)) {
      if (LEGACY_CORE_PROVIDER_IDS.includes(competition.providerId as never)) {
        continue;
      }
      const score = resolveTargetPrestigeScore({
        providerId: competition.providerId,
        tier: competition.tier,
        existingScore: null,
      });
      expect(score).toBeGreaterThanOrEqual(50);
    }
  });
});
