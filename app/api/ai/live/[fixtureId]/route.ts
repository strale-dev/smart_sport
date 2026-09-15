import * as Sentry from "@sentry/nextjs";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { userHasLiveMatchAccessToday } from "@/lib/entitlements/live-view-gate";
import { readLiveInsight } from "@/lib/services/aiService";
import { resolveFixtureUuidByExternalId } from "@/lib/predictions/db";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ fixtureId: string }>;
};

function parseFixtureId(raw: string): number | null {
  const fixtureId = Number.parseInt(raw, 10);
  if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
    return null;
  }

  return fixtureId;
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { fixtureId: rawFixtureId } = await context.params;
    const fixtureId = parseFixtureId(rawFixtureId);

    if (!fixtureId) {
      return NextResponse.json(
        { ok: false, error: "INVALID_FIXTURE_ID" },
        { status: 400 }
      );
    }

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "GUEST_FORBIDDEN" }, { status: 403 });
    }

    const fixture = await resolveFixtureUuidByExternalId(fixtureId);
    if (fixture) {
      const allowed = await userHasLiveMatchAccessToday(userId, fixture.id);
      if (!allowed) {
        return NextResponse.json(
          {
            status: "AI_LIMIT_REACHED",
            reason: "LIVE_DAILY_LIMIT",
            fixtureExternalId: fixtureId,
          },
          { status: 429 }
        );
      }
    }

    const result = await readLiveInsight(fixtureId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    Sentry.captureException(error);
    console.error("[api/ai/live GET]", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
