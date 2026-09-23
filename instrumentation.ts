import * as Sentry from "@sentry/nextjs";

import { assertOpenAiConfiguredInProduction } from "@/lib/env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    assertOpenAiConfiguredInProduction();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
