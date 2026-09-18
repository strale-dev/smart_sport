import { expect, test } from "@playwright/test";

import { applyGuestCookieConsent } from "./helpers/consent";

test.beforeEach(async ({ page }) => {
  await applyGuestCookieConsent(page);
});

test.describe("Landing page", () => {
  test("hero and waitlist visible", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Scorence" })).toBeVisible();
    await expect(page.getByText(/future of sports prediction/i)).toBeVisible();
  });
});
