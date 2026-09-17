import type { Json } from "@/types/supabase";

export function fixtureProviderIdFromPayload(
  payload: Json | null
): number | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const raw = (payload as Record<string, unknown>).fixtureProviderId;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  return null;
}
