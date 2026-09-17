import { Text } from "@react-email/components";

import {
  EmailLayout,
  emailParagraph,
} from "@/lib/emails/components/EmailLayout";
import { BRAND } from "@/lib/marketing/copy";

export type TrialEndingEmailProps = {
  siteUrl: string;
  trialEndsAt: string;
};

function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "");
}

/** Formats an ISO timestamptz for email copy (UTC calendar date). */
export function formatTrialEndsAtForEmail(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

export function TrialEndingEmail({
  siteUrl,
  trialEndsAt,
}: TrialEndingEmailProps) {
  const base = normalizeSiteUrl(siteUrl);
  const endsLabel = formatTrialEndsAtForEmail(trialEndsAt);

  return (
    <EmailLayout
      preview={`Your ${BRAND.name} Premium trial ends in 3 days`}
      title="Your trial ends in 3 days"
      ctaHref={`${base}/profile/subscription`}
      ctaLabel="Manage subscription"
    >
      <Text style={emailParagraph}>
        Your {BRAND.name} Premium trial is scheduled to end on{" "}
        <strong style={strong}>{endsLabel}</strong> (UTC). After that, your
        account moves to the free tier — follows, favorites, and your profile
        stay saved.
      </Text>
      <Text style={emailParagraph}>
        No action is required if you want to continue on free. To keep unlimited
        AI match intelligence, manage billing before the trial ends.
      </Text>
    </EmailLayout>
  );
}

const strong = {
  color: "#F5F7FA",
};

export default TrialEndingEmail;
