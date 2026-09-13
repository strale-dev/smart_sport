import { expect, test } from "@playwright/test";

import { PINNED_MATCH_QA_FIXTURES } from "../lib/qa/pinned-fixture-ids";
import { applyGuestCookieConsent } from "./helpers/consent";

const ftFixtureId =
  process.env.UI_B3_FT_FIXTURE_ID ?? String(PINNED_MATCH_QA_FIXTURES.ftWithXg);
const nsFixtureId = String(PINNED_MATCH_QA_FIXTURES.nsNoLineups);
const liveFixtureId = process.env.UI_B3_LIVE_FIXTURE_ID;

test.beforeEach(async ({ page }) => {
  await applyGuestCookieConsent(page);
});

test.describe("Match page regression (guest)", () => {
  test("FT overview shows stats when data exists (B1)", async ({ page }) => {
    await page.goto(`/matches/${ftFixtureId}`);

    await expect(page.getByText("AI match analysis")).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByText("Stats not available yet")).toHaveCount(0);
    await expect(page.getByText("Live stats")).toBeVisible();

    await page.getByRole("tab", { name: "Lineups" }).click();
    await expect(page.getByRole("tab", { name: "Lineups" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await page.getByRole("tab", { name: "Standings" }).click();
    await page.getByRole("tab", { name: "Matches" }).click();
    await page.getByRole("tab", { name: "Overview" }).click();
  });

  test("NS prematch shows locked AI hero", async ({ page }) => {
    await page.goto(`/matches/${nsFixtureId}`);

    await expect(
      page.getByRole("button", {
        name: /sign up free to unlock ai predictions/i,
      })
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("tab", { name: "AI Engine" }).click();
    await expect(page.getByText("AI match analysis")).toBeVisible();
    await expect(page.getByText("AI match analysis")).toHaveCount(1);
    await expect(page.getByText("Detailed analysis not ready yet")).toHaveCount(
      0
    );
  });

  test("NS overview shows form/H2H previews with Matches CTA (U1)", async ({
    page,
  }) => {
    await page.goto(`/matches/${nsFixtureId}`);

    await expect(page.getByText("Recent form")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Head to head")).toBeVisible();

    await page.getByRole("link", { name: /see full form on matches/i }).click();

    await expect(page.getByRole("tab", { name: "Matches" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.getByText("Recent form").first()).toBeVisible();
  });

  test("NS overview lineup teaser CTA opens AI Engine tab (U3)", async ({
    page,
  }) => {
    await page.goto(`/matches/${nsFixtureId}`);

    await expect(page.getByText("Lineups not confirmed yet")).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("link", { name: /preview with ai/i }).click();

    await expect(page.getByRole("tab", { name: "AI Engine" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  test("P1 density and hero (guest)", async ({ page }) => {
    const nsFixtureId = String(PINNED_MATCH_QA_FIXTURES.nsNoLineups);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/matches/${nsFixtureId}`);
    await expect(
      page.getByRole("button", {
        name: /sign up free to unlock ai predictions/i,
      })
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Recent form")).toBeVisible();

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
      )
    ).toBe(false);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/matches/${nsFixtureId}`);
    await expect(
      page.getByRole("button", {
        name: /sign up free to unlock ai predictions/i,
      })
    ).toBeVisible({ timeout: 30_000 });

    const heroHeight = await page
      .locator('[data-slot="ai-hero"]')
      .evaluate((el) => el.getBoundingClientRect().height);

    expect(heroHeight).toBeGreaterThanOrEqual(192);
    expect(heroHeight).toBeLessThanOrEqual(22 * 16 + 4);
  });

  test("Match header PRD fields at 375px (U4)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`/matches/${nsFixtureId}`);
    await expect(
      page.getByRole("button", {
        name: /sign up free to unlock ai predictions/i,
      })
    ).toBeVisible({ timeout: 30_000 });

    const matchHeading = page.getByRole("heading", { level: 1 });
    await expect(matchHeading).toContainText(/vs/i);

    const headerCard = matchHeading.locator(
      'xpath=ancestor::*[@data-slot="card"][1]'
    );
    await expect(
      headerCard.locator('a[href^="/leagues/"]').first()
    ).toBeVisible();
    await expect(headerCard.locator('a[href^="/teams/"]')).toHaveCount(2);

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
      )
    ).toBe(false);

    await page.goto(`/matches/${ftFixtureId}`);
    await expect(page.getByText("Live stats")).toBeVisible({ timeout: 30_000 });
    const ftHeading = page.getByRole("heading", { level: 1 });
    await expect(ftHeading).toContainText(/vs/i);
    const ftHeaderCard = ftHeading.locator(
      'xpath=ancestor::*[@data-slot="card"][1]'
    );
    await expect(ftHeaderCard.locator('a[href^="/teams/"]')).toHaveCount(2);
    await expect(ftHeaderCard.getByText(/\d+ – \d+/).first()).toBeVisible();

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
      )
    ).toBe(false);
  });

  test("Live overview avoids false empty stats (B2)", async ({ page }) => {
    test.skip(
      !liveFixtureId,
      "Set UI_B3_LIVE_FIXTURE_ID (run ui-b3:smoke first)"
    );

    await page.goto(`/matches/${liveFixtureId}`);

    await expect(page.getByText("Live stats")).toBeVisible({ timeout: 30_000 });

    const emptyStats = page.getByText("Stats not in yet");
    const emptyTimeline = page.getByText("No events yet");

    await expect
      .poll(
        async () => {
          const statsEmpty = await emptyStats.count();
          const timelineEmpty = await emptyTimeline.count();
          return statsEmpty + timelineEmpty;
        },
        { timeout: 3_000 }
      )
      .toBeLessThan(2);
  });
});
