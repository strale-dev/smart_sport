"use client";

import type { PostHog } from "posthog-js";

import { publicEnv } from "@/lib/env.client";

let posthogPromise: Promise<PostHog | null> | null = null;
let posthogInstance: PostHog | null = null;

export async function getPostHogClient(): Promise<PostHog | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (posthogInstance) {
    return posthogInstance;
  }

  if (!posthogPromise) {
    posthogPromise = import("posthog-js").then(({ default: posthog }) => {
      posthog.init(publicEnv.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: publicEnv.NEXT_PUBLIC_POSTHOG_HOST,
        capture_pageview: false,
        capture_pageleave: false,
        persistence: "localStorage+cookie",
        opt_out_capturing_by_default: true,
        autocapture: false,
      });
      posthog.register({
        app_env: publicEnv.NEXT_PUBLIC_APP_ENV,
      });
      posthogInstance = posthog;
      return posthog;
    });
  }

  return posthogPromise;
}

export async function setPostHogAnalyticsConsent(
  enabled: boolean
): Promise<void> {
  const posthog = await getPostHogClient();
  if (!posthog) {
    return;
  }

  if (enabled) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

export async function captureClientEvent(
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const posthog = await getPostHogClient();
  if (!posthog || posthog.has_opted_out_capturing()) {
    return;
  }

  posthog.capture(event, properties);
}
