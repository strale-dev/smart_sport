import { getEnabledProviderIds } from "@/lib/competitions/index";
import {
  LEGACY_CORE_PROVIDER_IDS,
  MORE_TAB_PROVIDER_IDS,
  PRIMARY_TAB_PROVIDER_IDS,
} from "@/lib/competitions/legacy";

export const BACKFILL_MAX_SEASONS_PER_LEAGUE = 15;
export const BACKFILL_TARGET_FINISHED_PER_TEAM = 300;

/** Tier 1: primary UX leagues + legacy core + domestic cups in core set. */
export function resolveBackfillLeagueProviderIds(tier: 1 | 2): number[] {
  const tier1 = new Set<number>([
    ...PRIMARY_TAB_PROVIDER_IDS,
    ...MORE_TAB_PROVIDER_IDS,
    ...LEGACY_CORE_PROVIDER_IDS,
  ]);

  if (tier === 1) {
    return [...tier1].sort((a, b) => a - b);
  }

  return getEnabledProviderIds()
    .filter((id) => !tier1.has(id))
    .sort((a, b) => a - b);
}

/** Tier-1 clubs used for gap-fill (top leagues sample). */
export const TIER1_GAP_FILL_TEAM_PROVIDER_IDS = [
  50, // Manchester City
  42, // Arsenal
  40, // Liverpool
  541, // Real Madrid
  529, // Barcelona
  157, // Bayern
  85, // PSG
  505, // Inter
  496, // Juventus
  598, // Crvena Zvezda
] as const;
