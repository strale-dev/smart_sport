import { expect, test } from "@playwright/test";

test.describe("Dashboard (authenticated)", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("shows main sections and match links", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByText(/Important today|Next synced fixtures/)
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText("AI insights")).toBeVisible();
    await expect(page.getByText("Followed teams & players")).toBeVisible();
  });
});
