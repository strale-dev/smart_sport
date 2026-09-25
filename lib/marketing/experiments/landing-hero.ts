export const LANDING_HERO_EXPERIMENT_FLAG = "landing-hero-v2" as const;

export type LandingHeroVariant = "control" | "test";

export type LandingHeroCopy = {
  subheadline: string;
  waitlistHint: string;
};

export const landingHeroCopyByVariant: Record<
  LandingHeroVariant,
  LandingHeroCopy
> = {
  control: {
    subheadline:
      "Real football data, statistical modeling, and AI explanations — plus a Predictions Center with transparent high-confidence picks. No betting odds. No bookmakers. Just football intelligence.",
    waitlistHint: "Join the waitlist for early access.",
  },
  test: {
    subheadline:
      "Open any match and get live stats, momentum, and AI explanations you can actually read — with a Predictions Center for high-confidence picks. No odds. No bookmakers.",
    waitlistHint:
      "No betting odds — join the waitlist for early access to Scorence.",
  },
};

export function resolveLandingHeroVariant(
  flagValue: string | boolean | undefined
): LandingHeroVariant {
  if (flagValue === "test" || flagValue === true) {
    return "test";
  }
  return "control";
}

export function landingHeroCopyForVariant(
  variant: LandingHeroVariant
): LandingHeroCopy {
  return landingHeroCopyByVariant[variant];
}
