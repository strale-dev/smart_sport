import type { ErrorEvent, EventHint } from "@sentry/nextjs";

function isInternalLivePollTransaction(
  transaction: string | undefined
): boolean {
  if (!transaction) {
    return false;
  }

  return (
    transaction.includes("/api/internal/live/poll-tick") ||
    transaction.includes("/api/internal/live/poll-center-tick")
  );
}

function isCronTransaction(transaction: string | undefined): boolean {
  return transaction?.includes("/api/cron/") ?? false;
}

function isExpectedInternalLivePollFailure(error: Error): boolean {
  return (
    error.name === "ApiFootballError" ||
    error.name === "ApiFootballQuotaError" ||
    error.name === "OpenAiNotConfiguredError" ||
    error.message.includes("API-Football")
  );
}

function isUpstashQuotaExceeded(error: Error): boolean {
  return (
    error.name === "UpstashError" ||
    error.message.includes("max requests limit exceeded")
  );
}

function isExpectedProviderInfraNoise(error: Error): boolean {
  return (
    error.name === "ApiFootballQuotaError" ||
    error.message.includes("API-Football daily quota is low") ||
    error.message.includes("non-critical request refused")
  );
}

function isTransientDatabaseNoise(error: Error): boolean {
  const message = error.message;
  return (
    message.includes("Timed out acquiring connection from connection pool") ||
    message.includes("upstream request timeout") ||
    message.includes("canceling statement due to statement timeout")
  );
}

function isExpectedPrematchAvailabilityMessage(
  message: string | undefined
): boolean {
  if (!message) {
    return false;
  }

  return (
    message.includes("not ready for prematch prediction") ||
    message.includes("Unable to build features for fixture")
  );
}

/** Drop expected cron/provider noise; keep user-facing route failures in Sentry. */
export function sentryBeforeSend(
  event: ErrorEvent,
  hint: EventHint
): ErrorEvent | null {
  const transaction = event.transaction;
  const original = hint.originalException;

  if (
    isInternalLivePollTransaction(transaction) &&
    original instanceof Error &&
    isExpectedInternalLivePollFailure(original)
  ) {
    return null;
  }

  if (event.message === "live_prediction_unavailable") {
    return null;
  }

  if (event.message === "API-Football daily quota is low") {
    return null;
  }

  if (isExpectedPrematchAvailabilityMessage(event.message)) {
    return null;
  }

  if (original instanceof Error) {
    if (isUpstashQuotaExceeded(original)) {
      return null;
    }

    if (
      isCronTransaction(transaction) &&
      isExpectedProviderInfraNoise(original)
    ) {
      return null;
    }

    if (isExpectedPrematchAvailabilityMessage(original.message)) {
      return null;
    }

    if (isTransientDatabaseNoise(original)) {
      return null;
    }
  }

  return event;
}
