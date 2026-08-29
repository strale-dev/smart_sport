import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(500).optional()
);

export const waitlistSubscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(320),
  source: optionalTrimmedString,
  utm_source: optionalTrimmedString,
  utm_medium: optionalTrimmedString,
  utm_campaign: optionalTrimmedString,
  referrer: optionalTrimmedString,
});

export type WaitlistSubscribeInput = z.infer<typeof waitlistSubscribeSchema>;

export type WaitlistSubscribeStatus = "subscribed" | "already_subscribed";

export type WaitlistSubscribeResult = {
  status: WaitlistSubscribeStatus;
  message: string;
  emailSent?: boolean;
};

export const WAITLIST_MESSAGES = {
  subscribed: "You're on the list!",
  already_subscribed: "You're already on the list.",
} as const satisfies Record<WaitlistSubscribeStatus, string>;
