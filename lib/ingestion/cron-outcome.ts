export type CronOutcomeInput = {
  skipped?: boolean;
  failedCount?: number;
  degraded?: boolean;
  /** Time-budget partial run: work done but incomplete — degraded, scheduler may stay green. */
  partialForTimeBudget?: boolean;
};

export type CronOutcome = {
  ok: boolean;
  degraded?: boolean;
};

/**
 * Unified cron success rules (Phase 2 RCA).
 * - Skipped jobs: ok true (intentional no-op).
 * - Any failed units or explicit degraded: ok false unless only time-budget partial with zero failures.
 */
export function resolveCronOutcome(input: CronOutcomeInput): CronOutcome {
  if (input.skipped) {
    return { ok: true };
  }

  const failed = input.failedCount ?? 0;
  const explicitlyDegraded = input.degraded === true;
  const hasFailure = failed > 0 || explicitlyDegraded;

  if (input.partialForTimeBudget && failed === 0) {
    return { ok: true, degraded: true };
  }

  if (hasFailure) {
    return { ok: false, degraded: true };
  }

  return { ok: true };
}
