import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { capturePushLifecycleEvent } from "@/lib/posthog/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(512).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: parsed.data.userAgent ?? null,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "UPSERT_FAILED" }, { status: 500 });
  }

  await supabase
    .from("user_preferences")
    .update({ notify_push: true })
    .eq("user_id", user.id);

  await capturePushLifecycleEvent({
    userId: user.id,
    event: "push_subscribed",
  }).catch((analyticsError: unknown) => {
    console.warn("[push] posthog capture failed", analyticsError);
  });

  return NextResponse.json({ ok: true });
}
