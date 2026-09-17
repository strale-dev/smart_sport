import { Text } from "@react-email/components";

import {
  EmailLayout,
  emailParagraph,
} from "@/lib/emails/components/EmailLayout";
import { BRAND } from "@/lib/marketing/copy";

export type PaymentSuccessEmailProps = {
  siteUrl: string;
  renewalDate?: string | null;
};

function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "");
}

export function PaymentSuccessEmail({
  siteUrl,
  renewalDate,
}: PaymentSuccessEmailProps) {
  const base = normalizeSiteUrl(siteUrl);
  const renewalLine =
    renewalDate && Number.isFinite(Date.parse(renewalDate))
      ? ` Your next renewal is scheduled for ${new Intl.DateTimeFormat(
          "en-GB",
          {
            dateStyle: "long",
            timeZone: "UTC",
          }
        ).format(new Date(renewalDate))} (UTC).`
      : "";

  return (
    <EmailLayout
      preview={`Your ${BRAND.name} Premium payment was successful`}
      title="Payment received"
      ctaHref={`${base}/profile/subscription`}
      ctaLabel="Manage subscription"
    >
      <Text style={emailParagraph}>
        Thanks — your {BRAND.name} Premium subscription is active. You now have
        unlimited AI match intelligence within fair-use limits.{renewalLine}
      </Text>
    </EmailLayout>
  );
}

export default PaymentSuccessEmail;
