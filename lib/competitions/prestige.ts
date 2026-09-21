import type { CompetitionTier } from "@/lib/competitions/types";
import { LEGACY_CORE_PROVIDER_IDS } from "@/lib/competitions/legacy";

/**
 * Authoritative prestige for the production allowlist (migrations 0019 + 0028).
 * Sync and migrations must never set a lower score for these IDs.
 */
export const LEGACY_LEAGUE_PRESTIGE_SCORE: Readonly<
  Record<(typeof LEGACY_CORE_PROVIDER_IDS)[number], number>
> = {
  2: 100,
  39: 95,
  140: 90,
  135: 88,
  78: 87,
  61: 85,
  3: 78,
  848: 62,
  94: 68,
  88: 66,
  286: 55,
};

/** Default prestige by coverage tier (non-legacy leagues). Tier 2 aligns with dashboard pool threshold (50). */
export const TIER_DEFAULT_PRESTIGE_SCORE: Readonly<
  Record<CompetitionTier, number>
> = {
  1: 75,
  2: 55,
  3: 35,
};

export function isLegacyCoreProviderId(
  providerId: number
): providerId is (typeof LEGACY_CORE_PROVIDER_IDS)[number] {
  return (LEGACY_CORE_PROVIDER_IDS as readonly number[]).includes(providerId);
}

export function getLegacyLeaguePrestigeScore(
  providerId: number
): number | undefined {
  if (!isLegacyCoreProviderId(providerId)) {
    return undefined;
  }
  return LEGACY_LEAGUE_PRESTIGE_SCORE[providerId];
}

/**
 * Target prestige for a league row. Legacy IDs use the explicit map.
 * Other leagues use tier defaults without lowering an existing higher score.
 */
export function resolveTargetPrestigeScore(input: {
  providerId: number;
  tier: CompetitionTier;
  existingScore?: number | null;
}): number {
  const legacy = getLegacyLeaguePrestigeScore(input.providerId);
  if (legacy != null) {
    const existing = input.existingScore ?? 0;
    return Math.max(legacy, existing);
  }

  const tierDefault = TIER_DEFAULT_PRESTIGE_SCORE[input.tier];
  const existing = input.existingScore;
  if (existing != null && existing > tierDefault) {
    return existing;
  }
  return tierDefault;
}
