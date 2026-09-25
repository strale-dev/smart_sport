import { broadcastNewNotification } from "@/lib/notifications/broadcaster";
import {
  buildNotificationDedupeKey,
  withDedupePayload,
  type NotificationKind,
} from "@/lib/notifications/dedupe";
import { isNotificationKindEnabled } from "@/lib/notifications/preferences";
import { buildPushUrlFromPayload } from "@/lib/push/notification-url";
import { sendPushToUser } from "@/lib/push/send";
import { getServerEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/supabase";

const POSTGRES_UNIQUE_VIOLATION = "23505";

export type NotificationServiceContext = {
  admin?: ReturnType<typeof createAdminClient>;
};

export type EnqueueNotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  fixtureId?: string | null;
  teamId?: string | null;
  playerId?: string | null;
  payload?: Record<string, unknown>;
  /** When set, merged into payload as dedupeKey (unique index enforced). */
  dedupeKey?: string;
  /** Skip preference read (caller already filtered). */
  skipPreferenceCheck?: boolean;
  /** Skip Realtime broadcast (batch callers may broadcast separately). */
  skipBroadcast?: boolean;
};

export type EnqueueNotificationResult =
  | {
      ok: true;
      notificationId: string;
      createdAt: string;
      inserted: true;
    }
  | { ok: true; inserted: false; reason: "duplicate" | "preference_disabled" }
  | { ok: false; reason: "insert_failed"; message: string };

function getAdmin(ctx?: NotificationServiceContext) {
  return ctx?.admin ?? createAdminClient();
}

async function readUserPreferences(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data, error } = await admin
    .from("user_preferences")
    .select(
      "notify_goal, notify_full_time, notify_lineup_confirmed, notify_prediction_shift, notify_ai_insight_refreshed"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`notification_prefs_read_failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data;
}

export async function enqueueNotification(
  input: EnqueueNotificationInput,
  ctx?: NotificationServiceContext
): Promise<EnqueueNotificationResult> {
  const admin = getAdmin(ctx);

  if (!input.skipPreferenceCheck) {
    const prefs = await readUserPreferences(admin, input.userId);
    if (prefs && !isNotificationKindEnabled(prefs, input.kind)) {
      return { ok: true, inserted: false, reason: "preference_disabled" };
    }
  }

  let payloadRecord: Record<string, unknown> = { ...(input.payload ?? {}) };
  if (input.dedupeKey) {
    payloadRecord = withDedupePayload(payloadRecord, input.dedupeKey);
  }

  const row: Database["public"]["Tables"]["notifications"]["Insert"] = {
    user_id: input.userId,
    kind: input.kind,
    channel: "IN_APP",
    title: input.title,
    body: input.body ?? null,
    fixture_id: input.fixtureId ?? null,
    team_id: input.teamId ?? null,
    player_id: input.playerId ?? null,
    payload: (Object.keys(payloadRecord).length > 0
      ? payloadRecord
      : null) as Json | null,
  };

  const { data, error } = await admin
    .from("notifications")
    .insert(row)
    .select("id, created_at")
    .single();

  if (error?.code === POSTGRES_UNIQUE_VIOLATION) {
    return { ok: true, inserted: false, reason: "duplicate" };
  }

  if (error || !data) {
    return {
      ok: false,
      reason: "insert_failed",
      message: error?.message ?? "no row returned",
    };
  }

  if (!input.skipBroadcast) {
    await broadcastNewNotification(input.userId, {
      notificationId: data.id,
      kind: input.kind,
      createdAt: data.created_at,
    });
  }

  void sendPushToUser(input.userId, {
    title: input.title,
    body: input.body,
    url: buildPushUrlFromPayload(
      payloadRecord,
      getServerEnv().NEXT_PUBLIC_SITE_URL
    ),
    tag: input.dedupeKey ?? data.id,
  }).catch((pushError: unknown) => {
    console.warn("[push] dispatch failed", pushError);
  });

  return {
    ok: true,
    notificationId: data.id,
    createdAt: data.created_at,
    inserted: true,
  };
}

export type EnqueueManyItem = Omit<EnqueueNotificationInput, "skipBroadcast">;

export type EnqueueManyResult = {
  inserted: number;
  duplicate: number;
  preferenceDisabled: number;
  failed: number;
};

export async function enqueueManyNotifications(
  items: EnqueueManyItem[],
  ctx?: NotificationServiceContext
): Promise<EnqueueManyResult> {
  const stats: EnqueueManyResult = {
    inserted: 0,
    duplicate: 0,
    preferenceDisabled: 0,
    failed: 0,
  };

  for (const item of items) {
    const result = await enqueueNotification(item, ctx);
    if (!result.ok) {
      stats.failed += 1;
      continue;
    }
    if (!result.inserted) {
      if (result.reason === "duplicate") {
        stats.duplicate += 1;
      } else {
        stats.preferenceDisabled += 1;
      }
      continue;
    }
    stats.inserted += 1;
  }

  return stats;
}

export { buildNotificationDedupeKey, broadcastNewNotification };
