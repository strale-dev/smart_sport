import type { ReactElement } from "react";
import { render } from "@react-email/render";

import { getResend, getResendFrom } from "@/lib/resend";

export type SendEmailInput = {
  to: string;
  subject: string;
  react: ReactElement;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const html = await render(input.react);

  const { error } = await getResend().emails.send({
    from: getResendFrom(),
    to: input.to,
    subject: input.subject,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
