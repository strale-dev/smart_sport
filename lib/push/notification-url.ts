import { fixtureProviderIdFromPayload } from "@/lib/notifications/fixture-link";

export function buildPushUrlFromPayload(
  payload: Record<string, unknown> | null | undefined,
  siteUrl: string
): string {
  const fixtureProviderId = fixtureProviderIdFromPayload(
    payload as import("@/types/supabase").Json | null
  );
  if (fixtureProviderId != null) {
    return `${siteUrl.replace(/\/$/, "")}/matches/${fixtureProviderId}`;
  }
  return `${siteUrl.replace(/\/$/, "")}/notifications`;
}
