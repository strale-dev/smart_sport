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

function isExpectedInternalLivePollFailure(error: Error): boolean {
  return (
    error.name === "ApiFootballError" ||
    error.name === "ApiFootballQuotaError" ||
    error.name === "OpenAiNotConfiguredError" ||
    error.message.includes("API-Football")
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

  return event;
}
