import {
  ApiFootballError,
  ApiFootballQuotaError,
  ApiFootballRateLimitError,
} from "@/lib/api-football/errors";

export function formatApiFootballFailureReason(error: unknown): string {
  if (error instanceof ApiFootballError && error.providerErrors) {
    return Object.entries(error.providerErrors)
      .map(([key, value]) => `${key}: ${value}`)
      .join("; ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export type OptionalProviderResult<T> =
  { ok: true; value: T } | { ok: false; reason: string };

export async function optionalProviderFetch<T>(
  label: string,
  fn: () => Promise<T>
): Promise<OptionalProviderResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    if (isOptionalProviderFailure(error)) {
      const reason = formatApiFootballFailureReason(error);
      console.warn(`[api-football] ${label} unavailable — ${reason}`);
      return { ok: false, reason };
    }

    throw error;
  }
}

export function isOptionalProviderFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "ApiFootballError" ||
    error.name === "ApiFootballQuotaError" ||
    error.name === "ApiFootballRateLimitError" ||
    error instanceof ApiFootballQuotaError ||
    error instanceof ApiFootballRateLimitError ||
    error.message.includes("API-Football")
  );
}

export async function safeOptionalProviderFetch<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isOptionalProviderFailure(error)) {
      console.warn(
        `[api-football] ${label} unavailable — ${formatApiFootballFailureReason(error)}`
      );
      return fallback;
    }

    throw error;
  }
}
