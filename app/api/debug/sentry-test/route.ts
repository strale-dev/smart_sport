import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env.server";
import { isSentryEnabled } from "@/lib/sentry/options";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getServerEnv();

  if (env.NEXT_PUBLIC_APP_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (!isSentryEnabled(env.SENTRY_DSN)) {
    return NextResponse.json(
      {
        ok: false,
        error: "SENTRY_NOT_CONFIGURED",
        message:
          "Set a real SENTRY_DSN in .env.local (replace the example placeholder).",
      },
      { status: 503 }
    );
  }

  const error = new Error("Kivora Phase 0 Sentry test error");

  Sentry.captureException(error, {
    tags: { source: "debug_sentry_test_route" },
  });

  await Sentry.flush(2000);

  return NextResponse.json(
    {
      ok: true,
      message: "Test error captured. Check your Sentry Issues dashboard.",
    },
    { status: 200 }
  );
}
