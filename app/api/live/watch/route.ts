import * as Sentry from "@sentry/nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AiLimitReachedError } from "@/lib/entitlements/entitlementService";
import {
  assertLiveMatchView,
  LiveDailyLimitError,
  LiveSimultaneousLimitError,
  recordLiveMatchView,
} from "@/lib/entitlements/live-view-gate";
import { isLivePollingEnabled } from "@/lib/env";
import { ensureWorkerRunning } from "@/lib/live/coordinator";
import { parseLiveWatchBody, toWatchRegistration } from "@/lib/live/live-api";
import { registerLiveWatch } from "@/lib/live/viewers";
import { resolveFixtureUuidByExternalId } from "@/lib/predictions/db";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import { createClient } from "@/lib/supabase/server";
import type { FixtureStatus } from "@/types/domain";

export const dynamic = "force-dynamic";

async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(request: Request) {
  if (!isLivePollingEnabled()) {
    return NextResponse.json(
      { ok: false, error: "live_polling_disabled" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const parsed = parseLiveWatchBody(body);
  if ("error" in parsed) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400 }
    );
  }

  const registration = toWatchRegistration(parsed);
  const userId = await getAuthenticatedUserId();

  if (
    registration.surface === "match" &&
    registration.fixtureProviderId != null &&
    userId
  ) {
    try {
      const fixture = await resolveFixtureUuidByExternalId(
        registration.fixtureProviderId
      );
      if (fixture && isLiveFixtureStatus(fixture.status as FixtureStatus)) {
        await assertLiveMatchView(
          userId,
          fixture.id,
          registration.fixtureProviderId
        );
        await recordLiveMatchView(
          userId,
          fixture.id,
          registration.fixtureProviderId
        );
      }
    } catch (error) {
      if (error instanceof LiveSimultaneousLimitError) {
        return NextResponse.json(
          {
            ok: false,
            code: error.code,
            limit: error.limit,
            used: error.used,
          },
          { status: 429 }
        );
      }
      if (error instanceof LiveDailyLimitError) {
        return NextResponse.json(
          {
            ok: false,
            code: error.code,
            limit: error.limit,
            used: error.used,
          },
          { status: 429 }
        );
      }
      if (error instanceof AiLimitReachedError) {
        return NextResponse.json(
          {
            ok: false,
            code: "AI_LIMIT_REACHED",
            limit: error.limit,
            used: error.used,
          },
          { status: 429 }
        );
      }

      Sentry.captureException(error);
      throw error;
    }
  }

  const watch = await registerLiveWatch({
    ...registration,
    userId: userId ?? undefined,
  });
  const worker = await ensureWorkerRunning(
    registration.surface,
    registration.fixtureProviderId
  );

  return NextResponse.json({
    ok: true,
    watchToken: watch.watchToken,
    expiresInSec: watch.expiresInSec,
    worker,
  });
}
