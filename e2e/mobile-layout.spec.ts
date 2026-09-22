import { expect, test, type Page } from "@playwright/test";

import { PINNED_MATCH_QA_FIXTURES } from "../lib/qa/pinned-fixture-ids";
import { applyGuestCookieConsent } from "./helpers/consent";

const widths = [320, 375, 390, 430] as const;

async function expectNoPageOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectSingleLineNames(
  page: Page,
  selector: string
): Promise<void> {
  const names = page.locator(selector);
  const count = await names.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < Math.min(count, 6); index += 1) {
    const metrics = await names.nth(index).evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const lineHeight = Number.parseFloat(style.lineHeight);
      return {
        whiteSpace: style.whiteSpace,
        lines:
          Number.isFinite(lineHeight) && lineHeight > 0
            ? rect.height / lineHeight
            : 1,
      };
    });

    expect(metrics.whiteSpace).toBe("nowrap");
    expect(metrics.lines).toBeLessThanOrEqual(1.2);
  }
}

test.beforeEach(async ({ page }) => {
  await applyGuestCookieConsent(page);
});

test.describe("mobile team names", () => {
  for (const width of widths) {
    test(`fixtures and match header stay on one line at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });

      await page.goto("/fixtures");
      await expect(page.locator('a[href^="/matches/"]').first()).toBeVisible({
        timeout: 30_000,
      });
      await expectNoPageOverflow(page);
      await expectSingleLineNames(page, 'a[href^="/matches/"] span[title]');

      await page.goto(`/matches/${PINNED_MATCH_QA_FIXTURES.ftWithXg}`);
      await expect(page.locator("[data-slot='match-header-hero']")).toBeVisible(
        {
          timeout: 30_000,
        }
      );
      await expectNoPageOverflow(page);
      await expectSingleLineNames(
        page,
        "[data-slot='match-header-hero'] span[title]"
      );
    });
  }

  test("match header can wrap team names on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/matches/${PINNED_MATCH_QA_FIXTURES.ftWithXg}`);
    const name = page
      .locator("[data-slot='match-header-hero'] span[title]")
      .first();
    await expect(name).toBeVisible({ timeout: 30_000 });
    const whiteSpace = await name.evaluate(
      (element) => getComputedStyle(element).whiteSpace
    );
    expect(whiteSpace).not.toBe("nowrap");
    await expectNoPageOverflow(page);
  });
});
