import * as Sentry from "@sentry/nextjs";

import { sendEmail } from "@/lib/emails/send";
import { TrialEndingEmail } from "@/lib/emails/templates/TrialEndingEmail";
import { trialEndingReminderWindowUtc } from "@/lib/emails/trial-ending-window";
import { env } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SendTrialEndingRemindersStats = {
  candidates: number;
  sent: number;
  skippedNoEmail: number;
  failed: number;
};

export async function sendTrialEndingReminders(
  reference: Date = new Date()
): Promise<SendTrialEndingRemindersStats> {
  const { windowStart, windowEnd } = trialEndingReminderWindowUtc(reference);
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("subscriptions")
    .select("id, user_id, trial_ends_at, profiles!inner(email)")
    .eq("status", "TRIALING")
    .is("trial_ending_email_sent_at", null)
    .not("trial_ends_at", "is", null)
    .gte("trial_ends_at", windowStart.toISOString())
    .lt("trial_ends_at", windowEnd.toISOString());

  if (error) {
    throw new Error(`Failed to load trial reminders: ${error.message}`);
  }

  const stats: SendTrialEndingRemindersStats = {
    candidates: rows?.length ?? 0,
    sent: 0,
    skippedNoEmail: 0,
    failed: 0,
  };

  const siteUrl = env.NEXT_PUBLIC_SITE_URL;

  for (const row of rows ?? []) {
    const profile = row.profiles as { email: string } | { email: string }[];
    const email = Array.isArray(profile) ? profile[0]?.email : profile?.email;

    if (!email?.trim() || !row.trial_ends_at) {
      stats.skippedNoEmail += 1;
      continue;
    }

    try {
      await sendEmail({
        to: email.trim(),
        subject: "Scorence Premium — your trial ends in 3 days",
        react: TrialEndingEmail({
          siteUrl,
          trialEndsAt: row.trial_ends_at,
        }),
      });

      const { data: updated, error: updateError } = await admin
        .from("subscriptions")
        .update({
          trial_ending_email_sent_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .is("trial_ending_email_sent_at", null)
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (updated) {
        stats.sent += 1;
      }
    } catch (sendError) {
      stats.failed += 1;
      Sentry.captureException(sendError);
      console.error(
        `[emails/trial-ending] failed for subscription ${row.id}`,
        sendError
      );
    }
  }

  return stats;
}
