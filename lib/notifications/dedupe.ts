import type { Database } from "@/types/supabase";

export type NotificationKind = Database["public"]["Enums"]["notification_kind"];

export function buildNotificationDedupeKey(
  kind: NotificationKind,
  parts: string[]
): string {
  const suffix = parts.filter(Boolean).join(":");
  return suffix ? `${kind}:${suffix}` : kind;
}

export function dedupeKeyFromPayload(
  payload: Record<string, unknown> | null | undefined
): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload.dedupeKey;
  if (typeof raw !== "string" || raw.trim() === "") {
    return null;
  }

  return raw;
}

export function withDedupePayload(
  payload: Record<string, unknown>,
  dedupeKey: string
): Record<string, unknown> {
  return { ...payload, dedupeKey };
}
