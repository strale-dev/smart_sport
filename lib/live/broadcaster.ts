import {
  LIVE_BROADCAST_EVENT,
  LIVE_FEED_CHANNEL,
  matchChannel,
  type LiveBroadcastPayload,
} from "@/lib/live/channels";
import { getServerEnv } from "@/lib/env.server";

type BroadcastMessage = {
  topic: string;
  event: string;
  payload: LiveBroadcastPayload;
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
      `realtime_broadcast_failed:${response.status}:${body.slice(0, 200)}`
    );
  }
}

async function sendBroadcastSafe(messages: BroadcastMessage[]): Promise<void> {
  try {
    await postRealtimeBroadcastMessages(messages);
  } catch (error) {
    console.error("[live/broadcast]", error);
  }
}

export async function broadcastMatchUpdate(
  fixtureProviderId: number,
  syncedAt: string
): Promise<void> {
  const payload: LiveBroadcastPayload = {
    fixtureProviderId,
    syncedAt,
    source: "match",
  };

  await sendBroadcastSafe([
    {
      topic: matchChannel(fixtureProviderId),
      event: LIVE_BROADCAST_EVENT,
      payload,
    },
    {
      topic: LIVE_FEED_CHANNEL,
      event: LIVE_BROADCAST_EVENT,
      payload,
    },
  ]);
}

export async function broadcastLiveFeedUpdate(
  syncedAt: string,
  source: LiveBroadcastPayload["source"] = "live-center"
): Promise<void> {
  const payload: LiveBroadcastPayload = {
    syncedAt,
    source,
  };

  await sendBroadcastSafe([
    {
      topic: LIVE_FEED_CHANNEL,
      event: LIVE_BROADCAST_EVENT,
      payload,
    },
  ]);
}

/** @internal Test seam */
export const __broadcastInternals = {
  postRealtimeBroadcastMessages,
};
