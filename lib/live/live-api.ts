import { z } from "zod";

import type { LiveWatchSurface } from "@/lib/live/constants";

export const liveWatchBodySchema = z.discriminatedUnion("surface", [
  z.object({
    surface: z.literal("match"),
    fixtureProviderId: z.number().int().positive(),
  }),
  z.object({
    surface: z.literal("live-center"),
  }),
]);

export type LiveWatchBody = z.infer<typeof liveWatchBodySchema>;

export const liveWatchTokenBodySchema = z.object({
  watchToken: z.string().uuid(),
});

export function parseLiveWatchBody(
  body: unknown
): LiveWatchBody | { error: string } {
  const parsed = liveWatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid body" };
  }
  return parsed.data;
}

export function parseWatchTokenBody(
  body: unknown
): { watchToken: string } | { error: string } {
  const parsed = liveWatchTokenBodySchema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid body" };
  }
  return parsed.data;
}

export function toWatchRegistration(body: LiveWatchBody): {
  surface: LiveWatchSurface;
  fixtureProviderId?: number;
} {
  if (body.surface === "match") {
    return {
      surface: body.surface,
      fixtureProviderId: body.fixtureProviderId,
    };
  }

  return { surface: body.surface };
}
