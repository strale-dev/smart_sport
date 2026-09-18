import { expect, test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { applyGuestCookieConsent } from "./helpers/consent";

const authFile = path.join(process.cwd(), "playwright", ".auth", "user.json");

async function tryLogin(
  page: import("@playwright/test").Page,
  email: string,
  password: string
): Promise<boolean> {
  await page.goto("/login?returnTo=/dashboard");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  try {
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    return true;
  } catch {
    return false;
  }
}

setup("authenticate QA user", async ({ page }) => {
  setup.setTimeout(60_000);
  const email = process.env.PLAYWRIGHT_QA_EMAIL?.trim() ?? "qa@scorence.app";
  const envPassword = process.env.PLAYWRIGHT_QA_PASSWORD?.trim();

  await applyGuestCookieConsent(page);

  const passwords = envPassword ? [envPassword] : ["Test123", "test123"];

  let loggedIn = false;
  for (const password of passwords) {
    if (await tryLogin(page, email, password)) {
      loggedIn = true;
      if (!envPassword) {
        console.warn(
          "QA login succeeded; set PLAYWRIGHT_QA_PASSWORD in .env.local to skip password guessing."
        );
      }
      break;
    }
    await page.goto("/login");
  }

  if (!loggedIn) {
    throw new Error(
      `QA login failed for ${email}. Set PLAYWRIGHT_QA_PASSWORD in .env.local.`
    );
  }

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
