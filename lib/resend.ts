import { Resend } from "resend";

import { getServerEnv } from "@/lib/env.server";

let cachedResend: Resend | undefined;

export function getResend(): Resend {
  if (!cachedResend) {
    cachedResend = new Resend(getServerEnv().RESEND_API_KEY);
  }

  return cachedResend;
}

export function getResendFrom(): string {
  return getServerEnv().RESEND_FROM;
}
