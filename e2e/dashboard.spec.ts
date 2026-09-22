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

  test("does not overflow and keeps featured names readable at 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/dashboard");

    await expect(
      page.getByText(/Important today|Next synced fixtures/)
    ).toBeVisible({ timeout: 30_000 });

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);

    const featuredNames = page
      .locator("section, [data-slot='card']")
      .locator("span[title]");
    const count = await featuredNames.count();
    for (let index = 0; index < Math.min(count, 8); index += 1) {
      const lines = await featuredNames.nth(index).evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const lineHeight = Number.parseFloat(style.lineHeight);
        if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
          return 1;
        }
        return rect.height / lineHeight;
      });
      expect(lines).toBeLessThanOrEqual(2.2);
    }
  });
});
