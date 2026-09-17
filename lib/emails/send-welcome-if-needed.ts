import * as Sentry from "@sentry/nextjs";

import { WelcomeEmail } from "@/lib/emails/templates/WelcomeEmail";
import { sendEmail } from "@/lib/emails/send";
import { env } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SendWelcomeIfNeededInput = {
  userId: string;
  email: string | null | undefined;
  emailConfirmedAt: string | null | undefined;
  displayName?: string | null;
};

export type SendWelcomeIfNeededResult =
  | { sent: true }
  | { sent: false; reason: "unconfirmed" | "no_email" | "already_sent" };

export async function sendWelcomeIfNeeded(
  input: SendWelcomeIfNeededInput
): Promise<SendWelcomeIfNeededResult> {
  if (!input.emailConfirmedAt) {
    return { sent: false, reason: "unconfirmed" };
  }

  const email = input.email?.trim();
  if (!email) {
    return { sent: false, reason: "no_email" };
  }

  const admin = createAdminClient();
  const { data: profile, error: readError } = await admin
    .from("profiles")
    .select("welcome_email_sent_at, display_name")
    .eq("id", input.userId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Failed to read profile: ${readError.message}`);
  }

  if (profile?.welcome_email_sent_at) {
    return { sent: false, reason: "already_sent" };
  }

  const displayName = input.displayName ?? profile?.display_name ?? null;

  try {
    await sendEmail({
      to: email,
      subject: "Welcome to Scorence",
      react: WelcomeEmail({
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
        displayName,
      }),
    });
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", input.userId)
    .is("welcome_email_sent_at", null)
    .select("id")
    .maybeSingle();

  if (updateError) {
    Sentry.captureException(
      new Error(
        `Welcome sent but failed to mark profile: ${updateError.message}`
      )
    );
  }

  if (!updated) {
    return { sent: false, reason: "already_sent" };
  }

  return { sent: true };
}
