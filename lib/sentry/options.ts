const PLACEHOLDER_DSN_PATTERN = /examplePublicKey|@o0\.ingest/;

export function isSentryEnabled(dsn: string | undefined): dsn is string {
  return Boolean(dsn && !PLACEHOLDER_DSN_PATTERN.test(dsn));
}

export function getSentryEnvironment(): string {
  return (
    process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "development"
  );
}

export const sentryBaseOptions = {
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  sendDefaultPii: false,
  environment: getSentryEnvironment(),
} as const;
