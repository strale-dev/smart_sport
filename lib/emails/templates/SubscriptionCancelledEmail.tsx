import { Text } from "@react-email/components";

import {
  EmailLayout,
  emailParagraph,
} from "@/lib/emails/components/EmailLayout";
import { BRAND } from "@/lib/marketing/copy";

export type SubscriptionCancelledEmailProps = {
  siteUrl: string;
};

function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "");
}

export function SubscriptionCancelledEmail({
  siteUrl,
}: SubscriptionCancelledEmailProps) {
  const base = normalizeSiteUrl(siteUrl);

  return (
    <EmailLayout
      preview={`Your ${BRAND.name} Premium subscription was cancelled`}
      title="Subscription cancelled"
      ctaHref={`${base}/pricing`}
      ctaLabel="View pricing"
    >
      <Text style={emailParagraph}>
        Your {BRAND.name} Premium subscription will not renew. Premium features
        end when your current billing period or trial ends. Your follows,
        favorites, and profile data stay saved.
      </Text>
    </EmailLayout>
  );
}

export default SubscriptionCancelledEmail;
