/**
 * Structured ingestion / cron logs (RCA Phase 3 — §14 fields).
 * Emits one JSON object per line for log drains (Vercel, GHA).
 */

export type IngestionErrorType =
  | "provider_error"
  | "upsert_error"
  | "budget_exceeded"
  | "live_polling_disabled"
  | "lock_not_acquired"
  | "generation_not_allowed"
  | "llm_fallback"
  | "context_build_failed"
  | "cron_exception"
  | "unknown";

export type IngestionObservabilityPayload = {
  job_name: string;
  stage: string;
  fixture_id?: number;
  error_type?: IngestionErrorType;
  ok?: boolean;
  degraded?: boolean;
  skipped?: boolean;
  reason?: string;
  /** Additional context (stats, trigger, etc.) */
  detail?: Record<string, unknown>;
};

const LOG_PREFIX = "[ingestion]";

export function logIngestionEvent(
  payload: IngestionObservabilityPayload
): void {
  const line = JSON.stringify({
    ...payload,
    ts: new Date().toISOString(),
  });

  const isProblem =
    payload.error_type != null ||
    payload.ok === false ||
    payload.degraded === true;

  if (isProblem) {
    console.warn(`${LOG_PREFIX} ${line}`);
  } else {
    console.info(`${LOG_PREFIX} ${line}`);
  }
}
