import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.QUALITY_BASE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

const qualityBrowsers = process.env.PLAYWRIGHT_QUALITY_BROWSERS === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: "chromium-authenticated",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
      testMatch: /dashboard\.spec\.ts/,
    },
    ...(qualityBrowsers
      ? [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
            testIgnore: /auth\.setup\.ts/,
          },
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
            testIgnore: /auth\.setup\.ts/,
          },
        ]
      : []),
  ],
  webServer: {
    command: "npm.cmd run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
    },
  },
});
