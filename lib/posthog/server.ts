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

export type AiInsightGeneratedEventInput = {
  userId: string;
  fixtureId: number;
  cached: boolean;
  model: string;
};

export async function captureAiInsightGenerated(
  input: AiInsightGeneratedEventInput
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
    distinctId: input.userId,
    event: "ai_insight_generated",
    properties: {
      fixture_id: input.fixtureId,
      cached: input.cached,
      model: input.model,
      app_env: env.NEXT_PUBLIC_APP_ENV,
    },
  });

  await posthog.shutdown();
}

export type BillingLifecycleEventInput = {
  userId: string;
  event: "trial_converted" | "subscription_cancelled";
  providerSubscriptionId?: string | null;
};

export type InternalModelMetricsViewedInput = {
  userId: string;
  periodDays: number;
  evaluatedCount: number;
};

export async function captureInternalModelMetricsViewed(
  input: InternalModelMetricsViewedInput
): Promise<void> {
  const posthogKey = getServerEnv().NEXT_PUBLIC_POSTHOG_KEY;

  if (!isPostHogProjectKey(posthogKey)) {
    return;
  }

  const posthog = getPostHog();

  posthog.capture({
    distinctId: input.userId,
    event: "internal_model_metrics_viewed",
    properties: {
      period_days: input.periodDays,
      evaluated_count: input.evaluatedCount,
      app_env: env.NEXT_PUBLIC_APP_ENV,
    },
  });

  await posthog.shutdown();
}

export type PushLifecycleEventInput = {
  userId: string;
  event: "push_subscribed" | "push_unsubscribed" | "push_send_failed";
};

export async function capturePushLifecycleEvent(
  input: PushLifecycleEventInput
): Promise<void> {
  const posthogKey = getServerEnv().NEXT_PUBLIC_POSTHOG_KEY;

  if (!isPostHogProjectKey(posthogKey)) {
    return;
  }

  const posthog = getPostHog();

  posthog.capture({
    distinctId: input.userId,
    event: input.event,
    properties: {
      app_env: env.NEXT_PUBLIC_APP_ENV,
    },
  });

  await posthog.shutdown();
}

export async function captureBillingLifecycleEvent(
  input: BillingLifecycleEventInput
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
    distinctId: input.userId,
    event: input.event,
    properties: {
      provider_subscription_id: input.providerSubscriptionId ?? null,
      app_env: env.NEXT_PUBLIC_APP_ENV,
    },
  });

  await posthog.shutdown();
}
