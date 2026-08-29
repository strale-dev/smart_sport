import { WaitlistConfirmationEmail } from "@/lib/emails/templates/WaitlistConfirmationEmail";
import { sendEmail } from "@/lib/emails/send";
import { env } from "@/lib/env.server";
import { captureWaitlistSignup } from "@/lib/posthog/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  WaitlistSubscribeInput,
  WaitlistSubscribeResult,
} from "@/lib/waitlist/schema";
import { WAITLIST_MESSAGES } from "@/lib/waitlist/schema";

const POSTGRES_UNIQUE_VIOLATION = "23505";

export async function subscribeToWaitlist(
  input: WaitlistSubscribeInput,
  ipHash: string | null
): Promise<WaitlistSubscribeResult> {
  const admin = createAdminClient();
  const confirmedAt = new Date().toISOString();

  const { error } = await admin.from("waitlist").insert({
    email: input.email,
    source: input.source ?? null,
    utm_source: input.utm_source ?? null,
    utm_medium: input.utm_medium ?? null,
    utm_campaign: input.utm_campaign ?? null,
    referrer: input.referrer ?? null,
    ip_hash: ipHash,
    confirmed_at: confirmedAt,
  });

  if (error?.code === POSTGRES_UNIQUE_VIOLATION) {
    return {
      status: "already_subscribed",
      message: WAITLIST_MESSAGES.already_subscribed,
      emailSent: false,
    };
  }

  if (error) {
    throw error;
  }

  let emailSent = false;

  try {
    await sendEmail({
      to: input.email,
      subject: "You're on the Kivora waitlist",
      react: WaitlistConfirmationEmail({ siteUrl: env.NEXT_PUBLIC_SITE_URL }),
    });
    emailSent = true;
  } catch (emailError) {
    console.error(
      "[waitlist] confirmation email failed:",
      emailError instanceof Error ? emailError.message : emailError
    );
  }

  try {
    await captureWaitlistSignup({
      email: input.email,
      source: input.source,
      utm_source: input.utm_source,
      utm_medium: input.utm_medium,
      utm_campaign: input.utm_campaign,
      referrer: input.referrer,
    });
  } catch (analyticsError) {
    console.error("[waitlist] posthog capture failed:", analyticsError);
  }

  return {
    status: "subscribed",
    message: emailSent
      ? WAITLIST_MESSAGES.subscribed
      : `${WAITLIST_MESSAGES.subscribed} We couldn't send a confirmation email right now — you're still on the list.`,
    emailSent,
  };
}
