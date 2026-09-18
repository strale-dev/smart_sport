export const BRAND = {
  name: "Scorence",
  tagline: "The Future of Sports Prediction",
  contactEmail: "hello@scorence.app",
  privacyEmail: "privacy@scorence.app",
} as const;

export const AI_DISCLAIMER =
  "Scorence predictions are AI-generated statistical estimates based on historical and live football data. They are not guaranteed outcomes and should be treated as analytical insights. Football, like life, has surprises.";

export const landingCopy = {
  hero: {
    subheadline:
      "Real football data, statistical modeling, and AI explanations — plus a Predictions Center with transparent high-confidence picks. No betting odds. No bookmakers. Just football intelligence.",
    waitlistHint: "Join the waitlist for early access.",
  },
  features: [
    {
      id: "ai-analysis",
      title: "AI Match Analysis",
      description:
        "Structured pre-match and live insights that explain what the data suggests — with confidence and data quality always visible.",
      icon: "brain" as const,
    },
    {
      id: "live-center",
      title: "Live Center",
      description:
        "Follow matches in real time with relevance-first sorting, filters, and clear live indicators when AI insights refresh.",
      icon: "radio" as const,
    },
    {
      id: "predictions",
      title: "Top Predictions",
      description:
        "High-confidence picks ranked transparently. Probabilities are estimates, not promises — uncertainty is part of the product.",
      icon: "target" as const,
    },
  ],
  waitlistSection: {
    title: "Get early access",
    description:
      "Be first in when Scorence opens. One email, no spam, no odds — we'll notify you when early access is ready.",
  },
  footer: {
    tagline: BRAND.tagline,
  },
} as const;

export const legalMeta = {
  privacy: {
    title: "Privacy Policy",
    description:
      "How Scorence collects, uses, and protects your personal data.",
  },
  terms: {
    title: "Terms of Service",
    description: "Terms governing your use of Scorence.",
  },
  lastUpdated: "2026-09-18",
  selfReviewNote:
    "Self-reviewed for MVP launch against product requirements (no gambling positioning, GDPR, subprocessors). Formal counsel optional for your jurisdiction.",
} as const;
