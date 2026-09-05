export const POSTHOG_EVENTS = {
  landingView: "landing_view",
  waitlistCtaClick: "waitlist_cta_click",
  cookieConsentUpdated: "cookie_consent_updated",
  signupCompleted: "signup_completed",
  loginCompleted: "login_completed",
  matchViewed: "match_viewed",
  matchTabChanged: "match_tab_changed",
  matchFormScopeChanged: "match_form_scope_changed",
  matchH2hScopeChanged: "match_h2h_scope_changed",
  matchMomentumViewed: "match_momentum_viewed",
  teamViewed: "team_viewed",
  playerViewed: "player_viewed",
  leagueViewed: "league_viewed",
} as const;

export type PostHogEventName =
  (typeof POSTHOG_EVENTS)[keyof typeof POSTHOG_EVENTS];
