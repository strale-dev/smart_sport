/** Stay under GitHub Actions trigger timeout (55s) and Vercel `maxDuration` (60s). */
export const CRON_INGEST_WALL_CLOCK_BUDGET_MS = 48_000;

export function cronIngestBudgetExceeded(
  startedAtMs: number,
  budgetMs = CRON_INGEST_WALL_CLOCK_BUDGET_MS
): boolean {
  return Date.now() - startedAtMs >= budgetMs;
}

export type CronIngestBudget = {
  exceeded: () => boolean;
  remainingMs: () => number;
};

export function createCronIngestBudget(
  startedAtMs: number,
  budgetMs = CRON_INGEST_WALL_CLOCK_BUDGET_MS
): CronIngestBudget {
  return {
    exceeded: () => cronIngestBudgetExceeded(startedAtMs, budgetMs),
    remainingMs: () => Math.max(0, budgetMs - (Date.now() - startedAtMs)),
  };
}
