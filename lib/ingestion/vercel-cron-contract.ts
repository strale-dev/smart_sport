/**
 * Vercel Hobby allows at most one run per cron job per day.
 * Sub-daily ingestion (lineups, 6h standings) runs via GitHub Actions until Vercel Pro cutover (ING-3).
 */
export const VERCEL_CRON_HOBBY_PATHS = {
  syncFixtures: "/api/cron/sync-fixtures",
  syncStandings: "/api/cron/sync-standings",
  syncMatchDetails: "/api/cron/sync-match-details",
  refreshAnalytics: "/api/cron/refresh-analytics",
  warmAiPrematch: "/api/cron/warm-ai-prematch",
  reapStaleLocks: "/api/cron/reap-stale-locks",
} as const;

/** Schedules that pass Vercel Hobby deploy validation (max once/day per job). */
export const VERCEL_CRON_HOBBY_SCHEDULES: Record<string, string> = {
  [VERCEL_CRON_HOBBY_PATHS.syncFixtures]: "0 4 * * *",
  [VERCEL_CRON_HOBBY_PATHS.syncStandings]: "30 4 * * *",
  [VERCEL_CRON_HOBBY_PATHS.syncMatchDetails]: "0 5 * * *",
  [VERCEL_CRON_HOBBY_PATHS.refreshAnalytics]: "0 3 * * *",
  [VERCEL_CRON_HOBBY_PATHS.warmAiPrematch]: "15 5 * * *",
  [VERCEL_CRON_HOBBY_PATHS.reapStaleLocks]: "45 5 * * *",
};

/** Apply after Vercel Pro upgrade — see docs/ING-3-pro-cutover.md */
export const VERCEL_CRON_PRO_TARGETS: Record<string, string> = {
  "/api/cron/sync-standings": "0 */6 * * *",
  "/api/cron/sync-lineups": "*/15 * * * *",
};

export const GITHUB_ACTIONS_INGESTION_PATHS = [
  "/api/cron/sync-lineups",
  "/api/cron/sync-standings",
] as const;
