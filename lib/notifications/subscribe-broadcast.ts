"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  NOTIFICATION_BROADCAST_EVENT,
  userNotificationsChannel,
  type NotificationBroadcastPayload,
} from "@/lib/notifications/channels";
import { createClient } from "@/lib/supabase/client";

type BroadcastEnvelope = {
  payload?: NotificationBroadcastPayload;
};

function extractPayload(
  envelope: BroadcastEnvelope | NotificationBroadcastPayload
): NotificationBroadcastPayload {
  if (
    envelope &&
    typeof envelope === "object" &&
    "notificationId" in envelope &&
    "kind" in envelope
  ) {
    return envelope as NotificationBroadcastPayload;
  }

  const nested = (envelope as BroadcastEnvelope).payload;
  if (nested) {
    return nested;
  }

  return {
    notificationId: "",
    kind: "GOAL_FOR_FOLLOWED_TEAM",
    createdAt: new Date().toISOString(),
  };
}

export function subscribeUserNotificationsBroadcast(
  userId: string,
  onNotification: (payload: NotificationBroadcastPayload) => void
): () => void {
  const supabase = createClient();
  const channelName = userNotificationsChannel(userId);
  const channel: RealtimeChannel = supabase.channel(channelName);

  channel
    .on("broadcast", { event: NOTIFICATION_BROADCAST_EVENT }, (message) => {
      onNotification(extractPayload(message as BroadcastEnvelope));
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
