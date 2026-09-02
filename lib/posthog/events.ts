export const POSTHOG_EVENTS = {
  landingView: "landing_view",
  waitlistCtaClick: "waitlist_cta_click",
  cookieConsentUpdated: "cookie_consent_updated",
  signupCompleted: "signup_completed",
  loginCompleted: "login_completed",
  matchViewed: "match_viewed",
} as const;

export type PostHogEventName =
  (typeof POSTHOG_EVENTS)[keyof typeof POSTHOG_EVENTS];
