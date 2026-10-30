import {
  ApiFootballError,
  ApiFootballQuotaError,
  ApiFootballRateLimitError,
  isRetryableApiFootballError,
} from "@/lib/api-football/errors";
import { formatApiFootballFailureReason } from "@/lib/api-football/safe-call";
import type { IngestionErrorType } from "@/lib/ingestion/ingestion-observability";

export type ClassifiedProviderError = {
  errorType: IngestionErrorType;
  retryable: boolean;
  reason: string;
};

function isFetchTimeoutError(error: unknown): boolean {
  if (!(error instanceof ApiFootballError)) {
    return false;
  }

  if (error.message === "API-Football request timed out") {
    return true;
  }

  if (
    error.cause instanceof DOMException &&
    error.cause.name === "TimeoutError"
  ) {
    return true;
  }

  if (error.cause instanceof Error && error.cause.name === "AbortError") {
    return true;
  }

  return false;
}

function isNetworkFetchFailed(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    error.message.toLowerCase().includes("fetch failed")
  );
}

/** Redact secrets from log-safe reason strings (does not mutate safe-call formatter). */
export function redactSecretsFromIngestionReason(reason: string): string {
  return reason
    .replace(/[?&]apikey=[^&\s]*/gi, "")
    .replace(/x-apisports-key:\s*\S+/gi, "x-apisports-key omitted");
}

export function classifyProviderError(error: unknown): ClassifiedProviderError {
  const rawReason = formatApiFootballFailureReason(error);
  const reason = redactSecretsFromIngestionReason(rawReason);

  if (error instanceof ApiFootballQuotaError) {
    return {
      errorType: "quota_exhausted",
      retryable: false,
      reason,
    };
  }

  if (error instanceof ApiFootballRateLimitError) {
    return {
      errorType: "rate_limited",
      retryable: true,
      reason,
    };
  }

  if (isNetworkFetchFailed(error)) {
    return {
      errorType: "network",
      retryable: true,
      reason,
    };
  }

  if (error instanceof ApiFootballError) {
    if (error.providerErrors && Object.keys(error.providerErrors).length > 0) {
      return {
        errorType: "provider_error",
        retryable: false,
        reason,
      };
    }

    if (isFetchTimeoutError(error)) {
      return {
        errorType: "timeout",
        retryable: true,
        reason,
      };
    }

    if (error.statusCode === 429) {
      return {
        errorType: "rate_limited",
        retryable: true,
        reason,
      };
    }

    if (
      error.statusCode !== undefined &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return {
        errorType: "permanent",
        retryable: false,
        reason,
      };
    }
  }

  return {
    errorType: "unknown",
    retryable: isRetryableApiFootballError(error),
    reason,
  };
}
