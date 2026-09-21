import { expect, test } from "@playwright/test";

import { applyGuestCookieConsent } from "./helpers/consent";

test.beforeEach(async ({ page }) => {
  await applyGuestCookieConsent(page);
});

test.describe("Fixtures discovery filters (guest)", () => {
  test("country select and competition search update the URL", async ({
    page,
  }) => {
    await page.goto("/fixtures");

    await expect(page.getByRole("heading", { name: "Fixtures" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByPlaceholder("Search competition…")).toBeVisible();

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Brazil", exact: true }).click();
    await expect(page).toHaveURL(/country=Brazil/);

    const search = page.getByPlaceholder("Search competition…");
    await search.fill("MLS");
    await search.press("Enter");
    await expect(page).toHaveURL(/q=MLS/);
  });

  test("deep link country filter renders fixtures header", async ({ page }) => {
    await page.goto("/fixtures?country=Argentina");

    await expect(page.getByRole("heading", { name: "Fixtures" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/country=Argentina/);
  });
});
