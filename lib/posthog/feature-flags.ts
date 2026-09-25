"use client";

import { getPostHogClient } from "@/lib/posthog/client";

export async function getFeatureFlagValue(
  flagKey: string
): Promise<string | boolean | undefined> {
  const posthog = await getPostHogClient();
  if (!posthog || posthog.has_opted_out_capturing()) {
    return undefined;
  }

  return posthog.getFeatureFlag(flagKey);
}
