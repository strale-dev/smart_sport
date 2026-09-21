/** Production allowlist before global expansion — must remain enabled after registry rollout. */
export const LEGACY_CORE_PROVIDER_IDS = [
  39, // Premier League
  140, // La Liga
  135, // Serie A
  78, // Bundesliga
  61, // Ligue 1
  2, // UEFA Champions League
  3, // UEFA Europa League
  848, // UEFA Conference League
  94, // Primeira Liga
  88, // Eredivisie
  286, // Super Liga (Serbia)
] as const;

export type LegacyCoreProviderId = (typeof LEGACY_CORE_PROVIDER_IDS)[number];

/** Primary Live / Fixtures tabs (prestige order). */
export const PRIMARY_TAB_PROVIDER_IDS = [
  39, 140, 135, 78, 61, 2, 3, 848,
] as const;

/** “More” dropdown tab order (legacy UX). */
export const MORE_TAB_PROVIDER_IDS = [94, 88, 286] as const;
