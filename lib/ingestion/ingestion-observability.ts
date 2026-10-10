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
  fixture_provider_id?: number;
  resource?: string;
  provider_path?: string;
  persisted?: boolean;
  retryable?: boolean;
  error_type?: IngestionErrorType;
  ok?: boolean;
  degraded?: boolean;
  skipped?: boolean;
  reason?: string;
  /** Additional context (stats, trigger, etc.) */
  detail?: Record<string, unknown>;
};

export type FixtureIngestUnitLogInput = {
  job_name: string;
  stage?: string;
  fixtureProviderId: number;
  resource: string;
  outcome: string;
  persisted: boolean;
  skippedReason?: string;
  retryable?: boolean;
  providerPath?: string;
  detail?: Record<string, unknown>;
};

export function logFixtureIngestUnit(input: FixtureIngestUnitLogInput): void {
  logIngestionEvent({
    job_name: input.job_name,
    stage: input.stage ?? "fixture_unit",
    fixture_provider_id: input.fixtureProviderId,
    fixture_id: input.fixtureProviderId,
    resource: input.resource,
    provider_path: input.providerPath,
    persisted: input.persisted,
    retryable: input.retryable,
    ok:
      input.outcome === "SUCCESS" ||
      input.outcome === "SKIPPED" ||
      input.outcome === "PARTIAL",
    skipped: input.outcome === "SKIPPED",
    reason: input.skippedReason ?? input.outcome,
    detail: input.detail,
  });
}

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
