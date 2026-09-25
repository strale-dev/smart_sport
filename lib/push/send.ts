import "server-only";

import webpush from "web-push";

import { getWebPushConfig, hasWebPushConfig } from "@/lib/push/config";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushNotificationPayload = {
  title: string;
  body?: string | null;
  url?: string | null;
  tag?: string | null;
};

function configureWebPush(): boolean {
  const config = getWebPushConfig();
  if (!config) {
    return false;
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return true;
}

export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; removed: number; skipped: boolean }> {
  if (!hasWebPushConfig() || !configureWebPush()) {
    return { sent: 0, removed: 0, skipped: true };
  }

  const admin = createAdminClient();
  const { data: prefs } = await admin
    .from("user_preferences")
    .select("notify_push")
    .eq("user_id", userId)
    .maybeSingle();

  if (!prefs?.notify_push) {
    return { sent: 0, removed: 0, skipped: true };
  }

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subscriptions?.length) {
    return { sent: 0, removed: 0, skipped: false };
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body ?? undefined,
    url: payload.url ?? "/notifications",
    tag: payload.tag ?? undefined,
  });

  let sent = 0;
  let removed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        message
      );
      sent += 1;
      await admin
        .from("push_subscriptions")
        .update({ last_success_at: new Date().toISOString() })
        .eq("id", sub.id);
    } catch (err: unknown) {
      const statusCode =
        err &&
        typeof err === "object" &&
        "statusCode" in err &&
        typeof (err as { statusCode: unknown }).statusCode === "number"
          ? (err as { statusCode: number }).statusCode
          : null;

      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
        removed += 1;
      }
    }
  }

  return { sent, removed, skipped: false };
}
