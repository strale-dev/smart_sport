import {
  ApiFootballError,
  ApiFootballQuotaError,
  ApiFootballRateLimitError,
} from "@/lib/api-football/errors";
import type { ApiFootballEnvelope } from "@/lib/api-football/types";

export type ApiFootballFetchOutcome<T> =
  | {
      kind: "success";
      data: ApiFootballEnvelope<T>;
      httpStatus: number;
    }
  | {
      kind: "empty";
      data: ApiFootballEnvelope<T>;
      httpStatus: number;
    }
  | {
      kind: "provider_error";
      httpStatus: number;
      path: string;
      providerErrors: Record<string, string>;
    }
  | {
      kind: "retryable";
      httpStatus: number;
      path: string;
      message: string;
      retryAfterMs?: number;
    }
  | {
      kind: "permanent";
      httpStatus?: number;
      path: string;
      message: string;
      cause?: unknown;
    };

export function normalizeProviderErrors(
  errors: ApiFootballEnvelope<unknown>["errors"]
): Record<string, string> | undefined {
  if (!errors) {
    return undefined;
  }

  if (Array.isArray(errors)) {
    return errors.reduce<Record<string, string>>((acc, error, index) => {
      acc[String(index)] = String(error);
      return acc;
    }, {});
  }

  if (typeof errors === "object") {
    return Object.fromEntries(
      Object.entries(errors as Record<string, unknown>).map(([key, value]) => [
        key,
        String(value),
      ])
    );
  }

  return { message: String(errors) };
}

export function hasProviderErrors(
  errors: ApiFootballEnvelope<unknown>["errors"]
): boolean {
  if (!errors) {
    return false;
  }

  if (Array.isArray(errors)) {
    return errors.length > 0;
  }

  if (typeof errors === "object") {
    return Object.keys(errors as Record<string, unknown>).length > 0;
  }

  return true;
}

export function parseRetryAfterMs(
  retryAfterHeader: string | null
): number | undefined {
  if (!retryAfterHeader?.trim()) {
    return undefined;
  }

  const trimmed = retryAfterHeader.trim();
  const asSeconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }

  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) {
    const delta = asDate - Date.now();
    return delta > 0 ? delta : 0;
  }

  return undefined;
}

export function parseAndValidateEnvelope<T>(
  body: unknown,
  _path: string
):
  | { ok: true; envelope: ApiFootballEnvelope<T> }
  | { ok: false; message: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      message: "API-Football response body is not a JSON object",
    };
  }

  const record = body as Record<string, unknown>;
  if (typeof record.get !== "string") {
    return {
      ok: false,
      message: "API-Football envelope missing string field `get`",
    };
  }

  if (typeof record.results !== "number" || !Number.isFinite(record.results)) {
    return {
      ok: false,
      message: "API-Football envelope missing numeric field `results`",
    };
  }

  if (!("response" in record)) {
    return {
      ok: false,
      message: "API-Football envelope missing field `response`",
    };
  }

  return { ok: true, envelope: body as ApiFootballEnvelope<T> };
}

export function envelopeOutcomeKind<T>(
  envelope: ApiFootballEnvelope<T>
): "success" | "empty" {
  if (envelope.results === 0) {
    return "empty";
  }

  return "success";
}

export function buildProviderErrorOutcome(
  httpStatus: number,
  path: string,
  providerErrors: Record<string, string>
): ApiFootballFetchOutcome<never> {
  return {
    kind: "provider_error",
    httpStatus,
    path,
    providerErrors,
  };
}

export function mapOutcomeToError<T>(
  outcome: ApiFootballFetchOutcome<T>
): ApiFootballEnvelope<T> {
  switch (outcome.kind) {
    case "success":
    case "empty":
      return outcome.data;
    case "provider_error":
      throw new ApiFootballError("API-Football provider returned errors", {
        statusCode: outcome.httpStatus,
        path: outcome.path,
        providerErrors: outcome.providerErrors,
      });
    case "retryable":
      throw new ApiFootballError(outcome.message, {
        statusCode: outcome.httpStatus,
        path: outcome.path,
        retryAfterMs: outcome.retryAfterMs,
      });
    case "permanent":
      throw new ApiFootballError(outcome.message, {
        statusCode: outcome.httpStatus,
        path: outcome.path,
        cause: outcome.cause,
      });
    default: {
      const _exhaustive: never = outcome;
      throw _exhaustive;
    }
  }
}

export function mapExhaustedRetryError(
  error: unknown,
  path: string,
  dayRemaining: number | null
): never {
  if (error instanceof ApiFootballRateLimitError) {
    throw error;
  }

  if (error instanceof ApiFootballQuotaError) {
    throw error;
  }

  if (error instanceof ApiFootballError && error.statusCode === 429) {
    if (dayRemaining === 0) {
      throw new ApiFootballQuotaError(
        "API-Football daily quota exhausted after retries."
      );
    }

    throw new ApiFootballRateLimitError(
      "API-Football rate limit exceeded after retries.",
      {
        path,
        retryAfterMs: error.retryAfterMs,
      }
    );
  }

  throw error;
}

export type ApiFootballRequestLogPayload = {
  scope: "api-football/client";
  path: string;
  outcome:
    | "success"
    | "empty"
    | "provider_error"
    | "retryable"
    | "permanent"
    | "quota_refused";
  httpStatus?: number;
  durationMs: number;
  attempts: number;
  retryAfterMs?: number;
};

export function logApiFootballRequest(
  payload: ApiFootballRequestLogPayload
): void {
  const line = JSON.stringify({
    ...payload,
    ts: new Date().toISOString(),
  });

  if (
    payload.outcome === "provider_error" ||
    payload.outcome === "permanent" ||
    payload.outcome === "retryable"
  ) {
    console.warn(`[api-football] ${line}`);
  } else {
    console.info(`[api-football] ${line}`);
  }
}
