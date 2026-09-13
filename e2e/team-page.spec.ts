import { expect, test } from "@playwright/test";

import { applyGuestCookieConsent } from "./helpers/consent";

test.describe("Team page", () => {
  test.beforeEach(async ({ page }) => {
    await applyGuestCookieConsent(page);
  });

  test("loads team details without error boundary", async ({ page }) => {
    await page.goto("/teams/33");

    await expect(
      page.getByRole("heading", { name: "Manchester United" })
    ).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("This page failed to load")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Matches" })).toBeVisible();
  });
});
