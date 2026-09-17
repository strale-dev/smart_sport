import { Text } from "@react-email/components";

import {
  EmailLayout,
  emailParagraph,
} from "@/lib/emails/components/EmailLayout";
import { BRAND } from "@/lib/marketing/copy";

/**
 * Preview / roadmap template only. Production password reset uses
 * supabase/templates/recovery.html via Supabase Auth + Resend SMTP.
 */
export type PasswordResetEmailProps = {
  resetUrl: string;
};

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview={`Reset your ${BRAND.name} password`}
      title="Reset your password"
      ctaHref={resetUrl}
      ctaLabel="Reset password"
    >
      <Text style={emailParagraph}>
        We received a request to reset the password for your {BRAND.name}{" "}
        account. This link expires in one hour and can only be used once.
      </Text>
      <Text style={emailParagraph}>
        If you did not request a reset, you can ignore this email.
      </Text>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
