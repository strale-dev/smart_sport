import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { capturePushLifecycleEvent } from "@/lib/posthog/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  endpoint: z.string().url().optional(),
});

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  }

  let endpoint: string | undefined;
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    endpoint = parsed.success ? parsed.data.endpoint : undefined;
  } catch {
    endpoint = undefined;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let query = supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id);

  if (endpoint) {
    query = query.eq("endpoint", endpoint);
  }

  const { error } = await query;

  if (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }

  if (!endpoint) {
    await supabase
      .from("user_preferences")
      .update({ notify_push: false })
      .eq("user_id", user.id);
  }

  await capturePushLifecycleEvent({
    userId: user.id,
    event: "push_unsubscribed",
  }).catch((analyticsError: unknown) => {
    console.warn("[push] posthog capture failed", analyticsError);
  });

  return NextResponse.json({ ok: true });
}
