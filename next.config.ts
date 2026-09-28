import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

import { getVercelPublicEnvDefaults } from "./lib/env/vercel-public-defaults";

const vercelPublicEnv = getVercelPublicEnvDefaults(
  process.env as Record<string, string | undefined>
);

const nextConfig: NextConfig = {
  env: vercelPublicEnv as Record<string, string>,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.api-sports.io",
        pathname: "/football/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
