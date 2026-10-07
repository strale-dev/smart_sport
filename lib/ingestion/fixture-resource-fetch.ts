import { isRetryableApiFootballError } from "@/lib/api-football/errors";
import {
  formatApiFootballFailureReason,
  optionalProviderFetch,
} from "@/lib/api-football/safe-call";
import {
  classifyEmptyProviderPayload,
  type IngestionOutcome,
  type MatchDependencyKind,
  type ProviderDataAvailability,
} from "@/lib/ingestion/ingestion-result";
import { logIngestionEvent } from "@/lib/ingestion/ingestion-observability";
import type { FixtureStatus } from "@/types/domain";

export type FixtureResourceFetchResult<T> = {
  outcome: IngestionOutcome;
  availability?: ProviderDataAvailability;
  value?: T;
  reason?: string;
  rowCount: number;
};

export async function fetchFixtureResource<T>(
  label: string,
  dependency: MatchDependencyKind,
  input: {
    fixtureStatus: FixtureStatus;
    kickoffAt: string;
    supported: boolean;
    skipReason?: string;
  },
  fn: () => Promise<T>
): Promise<FixtureResourceFetchResult<T>> {
  if (!input.supported) {
    return {
      outcome: "SKIPPED",
      reason: input.skipReason ?? `${dependency}_not_supported_for_competition`,
      rowCount: 0,
    };
  }

  const fetchResult = await optionalProviderFetch(label, fn);

  if (!fetchResult.ok) {
    const reason = fetchResult.reason;
    const retryable = isRetryableProviderFailureReason(reason);
    const outcome = retryable ? "RETRYABLE_FAILURE" : "PERMANENT_FAILURE";
    logIngestionEvent({
      job_name: "fixture-resource-fetch",
      stage: "provider_fetch",
      resource: dependency,
      ok: false,
      retryable,
      reason,
    });
    return {
      outcome,
      reason,
      rowCount: 0,
    };
  }

  const value = fetchResult.value;
  const rowCount = Array.isArray(value) ? value.length : value ? 1 : 0;

  if (rowCount > 0) {
    return {
      outcome: "SUCCESS",
      availability: "AVAILABLE",
      value,
      rowCount,
    };
  }

  const availability = classifyEmptyProviderPayload({
    dependency,
    fixtureStatus: input.fixtureStatus,
    kickoffAt: input.kickoffAt,
  });

  return {
    outcome: "SUCCESS",
    availability,
    value,
    rowCount: 0,
    reason:
      availability === "NOT_YET_AVAILABLE"
        ? `${dependency}_not_yet_available`
        : `${dependency}_provider_returned_no_data`,
  };
}

function isRetryableProviderFailureReason(reason: string): boolean {
  const lowered = reason.toLowerCase();
  return (
    lowered.includes("rate limit") ||
    lowered.includes("quota") ||
    lowered.includes("429") ||
    lowered.includes("timed out") ||
    lowered.includes("retryable")
  );
}

export function mapThrownProviderError(error: unknown): {
  outcome: IngestionOutcome;
  reason: string;
} {
  if (isRetryableApiFootballError(error)) {
    return {
      outcome: "RETRYABLE_FAILURE",
      reason: formatApiFootballFailureReason(error),
    };
  }

  return {
    outcome: "PERMANENT_FAILURE",
    reason: formatApiFootballFailureReason(error),
  };
}

export function shouldPersistResourceWrite(
  availability: ProviderDataAvailability | undefined,
  rowCount: number
): boolean {
  if (rowCount > 0) {
    return true;
  }
  return availability === "PROVIDER_RETURNED_NO_DATA";
}
