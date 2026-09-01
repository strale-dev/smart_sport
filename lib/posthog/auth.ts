import { hasAnalyticsConsent } from "@/lib/cookies/consent";
import type { CookieConsentState } from "@/lib/cookies/types";
import { captureClientEvent, getPostHogClient } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";

export async function captureAuthSuccess(input: {
  event:
    | typeof POSTHOG_EVENTS.signupCompleted
    | typeof POSTHOG_EVENTS.loginCompleted;
  userId: string;
  consent: CookieConsentState | null;
}): Promise<void> {
  if (!hasAnalyticsConsent(input.consent)) {
    return;
  }

  const posthog = await getPostHogClient();
  if (!posthog || posthog.has_opted_out_capturing()) {
    return;
  }

  posthog.identify(input.userId);
  await captureClientEvent(input.event);
}

export async function resetAuthAnalytics(): Promise<void> {
  const posthog = await getPostHogClient();
  if (!posthog) {
    return;
  }

  posthog.reset();
}
