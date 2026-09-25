"use client";

import { useEffect, useState } from "react";

import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { BRAND } from "@/lib/marketing/copy";
import {
  LANDING_HERO_EXPERIMENT_FLAG,
  landingHeroCopyForVariant,
  resolveLandingHeroVariant,
  type LandingHeroVariant,
} from "@/lib/marketing/experiments/landing-hero";
import { captureClientEvent } from "@/lib/posthog/client";
import { getFeatureFlagValue } from "@/lib/posthog/feature-flags";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";

export function LandingHeroExperiment() {
  const [variant, setVariant] = useState<LandingHeroVariant>("control");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const flagValue = await getFeatureFlagValue(LANDING_HERO_EXPERIMENT_FLAG);
      if (cancelled) {
        return;
      }

      const resolved = resolveLandingHeroVariant(flagValue);
      setVariant(resolved);
      setReady(true);

      void captureClientEvent(POSTHOG_EVENTS.landingExperimentViewed, {
        experiment: LANDING_HERO_EXPERIMENT_FLAG,
        variant: resolved,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const copy = landingHeroCopyForVariant(variant);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            {BRAND.name}
          </h1>
          <p className="text-primary font-heading text-lg font-medium tracking-tight sm:text-xl">
            {BRAND.tagline}
          </p>
        </div>
        <p
          className="text-muted-foreground max-w-xl text-base leading-relaxed sm:text-lg"
          data-ready={ready ? "true" : "false"}
        >
          {copy.subheadline}
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">{copy.waitlistHint}</p>
        <WaitlistForm source="landing_hero" className="max-w-md" />
      </div>
    </div>
  );
}
