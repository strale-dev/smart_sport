import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled, sentryBaseOptions } from "@/lib/sentry/options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (isSentryEnabled(dsn)) {
  Sentry.init({
    dsn,
    ...sentryBaseOptions,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
