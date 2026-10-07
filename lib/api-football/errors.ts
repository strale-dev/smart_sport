export class ApiFootballError extends Error {
  readonly statusCode: number | undefined;
  readonly providerErrors: Record<string, string> | undefined;
  readonly path: string;
  readonly retryAfterMs: number | undefined;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      providerErrors?: Record<string, string>;
      path: string;
      cause?: unknown;
      retryAfterMs?: number;
    }
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiFootballError";
    this.statusCode = options.statusCode;
    this.providerErrors = options.providerErrors;
    this.path = options.path;
    this.retryAfterMs = options.retryAfterMs;
  }
}

export class ApiFootballConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiFootballConfigError";
  }
}

export class ApiFootballQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiFootballQuotaError";
  }
}

export class ApiFootballRateLimitError extends Error {
  readonly path: string;
  readonly retryAfterMs: number | undefined;

  constructor(
    message: string,
    options: { path: string; retryAfterMs?: number }
  ) {
    super(message);
    this.name = "ApiFootballRateLimitError";
    this.path = options.path;
    this.retryAfterMs = options.retryAfterMs;
  }
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function isRetryableApiFootballError(error: unknown): boolean {
  if (error instanceof ApiFootballRateLimitError) {
    return true;
  }

  if (error instanceof ApiFootballError) {
    if (error.statusCode !== undefined && isRetryableStatus(error.statusCode)) {
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
  }

  return false;
}
