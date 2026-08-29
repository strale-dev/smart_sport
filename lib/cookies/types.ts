export type CookieConsentCategories = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type CookieConsentState = CookieConsentCategories & {
  version: 1;
  updatedAt: string;
};

export type CookieConsentChoice =
  "accept_all" | "reject_non_essential" | "custom";
