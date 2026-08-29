import { PostHog } from "posthog-node";

import { env, getServerEnv } from "@/lib/env.server";
import { isPostHogProjectKey } from "@/lib/posthog/key";
import { hashEmail } from "@/lib/waitlist/ip";

let cachedPostHog: PostHog | undefined;

function getPostHog(): PostHog {
  if (!cachedPostHog) {
    cachedPostHog = new PostHog(getServerEnv().NEXT_PUBLIC_POSTHOG_KEY, {
      host: getServerEnv().NEXT_PUBLIC_POSTHOG_HOST,
    });
  }

  return cachedPostHog;
}

export type WaitlistSignupEventInput = {
  email: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
};

export async function captureWaitlistSignup(
  input: WaitlistSignupEventInput
): Promise<void> {
  const posthogKey = getServerEnv().NEXT_PUBLIC_POSTHOG_KEY;

  if (!isPostHogProjectKey(posthogKey)) {
    console.warn(
      "[posthog] NEXT_PUBLIC_POSTHOG_KEY must be a Project API key (phc_...) for server capture"
    );
    return;
  }

  const posthog = getPostHog();

  posthog.capture({
    distinctId: hashEmail(input.email),
    event: "waitlist_signup",
    properties: {
      source: input.source ?? null,
      utm_source: input.utm_source ?? null,
      utm_medium: input.utm_medium ?? null,
      utm_campaign: input.utm_campaign ?? null,
      referrer: input.referrer ?? null,
      app_env: env.NEXT_PUBLIC_APP_ENV,
    },
  });

  await posthog.shutdown();
}
