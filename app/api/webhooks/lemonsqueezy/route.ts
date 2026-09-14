import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { syncSubscriptionFromWebhook } from "@/lib/billing/sync-subscription";
import { verifyLemonSqueezyWebhookSignature } from "@/lib/billing/webhook-verify";
import type { LemonWebhookPayload } from "@/lib/billing/webhook-types";
import { sendEmail } from "@/lib/emails/send";
import { PaymentSuccessEmail } from "@/lib/emails/templates/PaymentSuccessEmail";
import { SubscriptionCancelledEmail } from "@/lib/emails/templates/SubscriptionCancelledEmail";
import { getLemonSqueezyWebhookSecret } from "@/lib/env";
import { env } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const HANDLED_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_payment_success",
  "subscription_payment_failed",
  "subscription_cancelled",
  "subscription_expired",
]);

async function readUserEmail(userId: string): Promise<string | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read profile email: ${error.message}`);
  }

  return data?.email ?? null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = getLemonSqueezyWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "WEBHOOK_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (
    !verifyLemonSqueezyWebhookSignature({
      rawBody,
      signatureHeader: signature,
      secret,
    })
  ) {
    return NextResponse.json(
      { ok: false, error: "INVALID_SIGNATURE" },
      {
        status: 401,
      }
    );
  }

  let payload: LemonWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonWebhookPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON" },
      {
        status: 400,
      }
    );
  }

  const eventName = payload.meta?.event_name;
  if (!eventName || !HANDLED_EVENTS.has(eventName)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const syncResult = await syncSubscriptionFromWebhook(payload);
    if (!syncResult || syncResult.skippedStale) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const email = await readUserEmail(syncResult.userId);
    const siteUrl = env.NEXT_PUBLIC_SITE_URL;

    if (email && eventName === "subscription_payment_success") {
      await sendEmail({
        to: email,
        subject: "Scorence Premium — payment received",
        react: PaymentSuccessEmail({ siteUrl }),
      });
    }

    if (email && eventName === "subscription_cancelled") {
      await sendEmail({
        to: email,
        subject: "Scorence Premium — subscription cancelled",
        react: SubscriptionCancelledEmail({ siteUrl }),
      });
    }

    return NextResponse.json({
      ok: true,
      tier: syncResult.tier,
      event: eventName,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error("[webhooks/lemonsqueezy]", error);
    return NextResponse.json(
      { ok: false, error: "PROCESSING_FAILED" },
      {
        status: 500,
      }
    );
  }
}
