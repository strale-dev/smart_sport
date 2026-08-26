import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const DEFAULT_FROM = "Smart Sport <onboarding@resend.dev>";
