import {
  NOTIFICATION_BROADCAST_EVENT,
  userNotificationsChannel,
  type NotificationBroadcastPayload,
} from "@/lib/notifications/channels";
import { getServerEnv } from "@/lib/env.server";

type BroadcastMessage = {
  topic: string;
  event: string;
  payload: NotificationBroadcastPayload;
};

async function postRealtimeBroadcastMessages(
  messages: BroadcastMessage[]
): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  const env = getServerEnv();
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `notification_broadcast_failed:${response.status}:${body.slice(0, 200)}`
    );
  }
}

export async function broadcastNewNotification(
  userId: string,
  payload: NotificationBroadcastPayload
): Promise<void> {
  try {
    await postRealtimeBroadcastMessages([
      {
        topic: userNotificationsChannel(userId),
        event: NOTIFICATION_BROADCAST_EVENT,
        payload,
      },
    ]);
  } catch (error) {
    console.error("[notifications/broadcast]", error);
  }
}

/** @internal Test seam */
export const __notificationBroadcastInternals = {
  postRealtimeBroadcastMessages,
};
