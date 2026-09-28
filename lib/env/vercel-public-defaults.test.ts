import { describe, expect, it } from "vitest";

import { getVercelPublicEnvDefaults } from "./vercel-public-defaults";

describe("getVercelPublicEnvDefaults", () => {
  it("does not override explicit values", () => {
    expect(
      getVercelPublicEnvDefaults({
        NEXT_PUBLIC_SITE_URL: "https://scorence.app",
        NEXT_PUBLIC_APP_ENV: "production",
        VERCEL_URL: "other.vercel.app",
        VERCEL_ENV: "preview",
      })
    ).toEqual({});
  });

  it("uses production app env on Vercel production", () => {
    expect(
      getVercelPublicEnvDefaults({
        VERCEL_ENV: "production",
        VERCEL_URL: "scorence.app",
      })
    ).toEqual({
      NEXT_PUBLIC_SITE_URL: "https://scorence.app",
      NEXT_PUBLIC_APP_ENV: "production",
    });
  });
});
