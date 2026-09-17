import { z } from "zod";

import { sanitizeTimezone } from "@/lib/datetime/timezone";

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required")
  .max(80, "Display name is too long");

export const timezoneSchema = z
  .string()
  .transform((value) => sanitizeTimezone(value));

export const avatarUrlSchema = z
  .string()
  .url("Invalid avatar URL")
  .max(2048)
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Invalid avatar URL" }
  );

export const preferredLeagueIdSchema = z.union([z.string().uuid(), z.null()]);

export const notificationPreferencesSchema = z.object({
  notifyGoal: z.boolean().optional(),
  notifyFullTime: z.boolean().optional(),
  notifyLineupConfirmed: z.boolean().optional(),
  notifyPredictionShift: z.boolean().optional(),
  notifyAiInsightRefreshed: z.boolean().optional(),
});

export type NotificationPreferencesInput = z.infer<
  typeof notificationPreferencesSchema
>;
