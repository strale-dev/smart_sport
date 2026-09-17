import { Text } from "@react-email/components";

import {
  EmailLayout,
  emailParagraph,
} from "@/lib/emails/components/EmailLayout";
import { BRAND } from "@/lib/marketing/copy";

export type WelcomeEmailProps = {
  siteUrl: string;
  displayName?: string | null;
};

function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "");
}

export function WelcomeEmail({ siteUrl, displayName }: WelcomeEmailProps) {
  const base = normalizeSiteUrl(siteUrl);
  const greeting = displayName?.trim()
    ? `Hi ${displayName.trim()},`
    : "Hi there,";

  return (
    <EmailLayout
      preview={`Welcome to ${BRAND.name} — your account is ready`}
      title="Welcome to Scorence"
      ctaHref={`${base}/dashboard`}
      ctaLabel="Open dashboard"
    >
      <Text style={emailParagraph}>{greeting}</Text>
      <Text style={emailParagraph}>
        Your account is confirmed. Explore match intelligence on the dashboard,
        follow teams you care about, and try Premium with a 7-day trial when
        you&apos;re ready.
      </Text>
      <Text style={emailParagraph}>
        Start your trial anytime from{" "}
        <a href={`${base}/pricing`} style={link}>
          pricing
        </a>
        .
      </Text>
    </EmailLayout>
  );
}

const link = {
  color: "#00E5A0",
  textDecoration: "underline",
};

export default WelcomeEmail;
