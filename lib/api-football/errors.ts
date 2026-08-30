export class ApiFootballError extends Error {
  readonly statusCode: number | undefined;
  readonly providerErrors: Record<string, string> | undefined;
  readonly path: string;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      providerErrors?: Record<string, string>;
      path: string;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiFootballError";
    this.statusCode = options.statusCode;
    this.providerErrors = options.providerErrors;
    this.path = options.path;
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

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}
