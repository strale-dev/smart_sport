import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { PINNED_MATCH_QA_FIXTURES } from "../lib/qa/pinned-fixture-ids";
import { applyGuestCookieConsent } from "./helpers/consent";

const fixtureId =
  process.env.QUALITY_MATCH_FIXTURE_ID ??
  String(PINNED_MATCH_QA_FIXTURES.ftWithXg);

const routes = [
  { name: "landing", path: "/" },
  { name: "dashboard", path: "/dashboard" },
  { name: "match", path: `/matches/${fixtureId}` },
] as const;

test.beforeEach(async ({ page }) => {
  await applyGuestCookieConsent(page);
});

for (const route of routes) {
  test(`no critical axe violations — ${route.name}`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    if (critical.length > 0) {
      console.error(JSON.stringify(critical, null, 2));
    }
    expect(critical, `critical a11y on ${route.path}`).toHaveLength(0);
  });
}
