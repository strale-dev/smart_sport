/** Stay under GitHub Actions trigger timeout (55s) and Vercel `maxDuration` (60s). */
export const CRON_INGEST_WALL_CLOCK_BUDGET_MS = 48_000;

export function cronIngestBudgetExceeded(
  startedAtMs: number,
  budgetMs = CRON_INGEST_WALL_CLOCK_BUDGET_MS
): boolean {
  return Date.now() - startedAtMs >= budgetMs;
}
