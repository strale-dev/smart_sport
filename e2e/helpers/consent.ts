import type { Page } from "@playwright/test";

import {
  CONSENT_STORAGE_KEY,
  consentFromChoice,
} from "../../lib/cookies/consent";

export async function applyGuestCookieConsent(page: Page): Promise<void> {
  const consent = consentFromChoice("reject_non_essential");
  const serialized = JSON.stringify(consent);

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: CONSENT_STORAGE_KEY, value: serialized }
  );
}
