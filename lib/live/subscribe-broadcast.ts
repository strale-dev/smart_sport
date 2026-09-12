"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  LIVE_BROADCAST_EVENT,
  LIVE_FEED_CHANNEL,
  matchChannel,
  type LiveBroadcastPayload,
} from "@/lib/live/channels";
import { createClient } from "@/lib/supabase/client";

type BroadcastEnvelope = {
  payload?: LiveBroadcastPayload;
};

function extractBroadcastPayload(
  envelope: BroadcastEnvelope | LiveBroadcastPayload
): LiveBroadcastPayload {
  if (
    envelope &&
    typeof envelope === "object" &&
    "syncedAt" in envelope &&
    "source" in envelope
  ) {
    return envelope as LiveBroadcastPayload;
  }

  return (
    (envelope as BroadcastEnvelope).payload ?? {
      syncedAt: new Date().toISOString(),
      source: "match",
    }
  );
}

export function subscribeMatchBroadcast(
  fixtureProviderId: number,
  onUpdate: (payload: LiveBroadcastPayload) => void
): () => void {
  const supabase = createClient();
  const channelName = matchChannel(fixtureProviderId);
  const channel: RealtimeChannel = supabase.channel(channelName);

  channel
    .on("broadcast", { event: LIVE_BROADCAST_EVENT }, (message) => {
      onUpdate(extractBroadcastPayload(message as BroadcastEnvelope));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ surface: "match", fixtureProviderId });
      }
    });

  return () => {
    void channel.untrack();
    void supabase.removeChannel(channel);
  };
}

export function subscribeLiveFeedBroadcast(
  onUpdate: (payload: LiveBroadcastPayload) => void
): () => void {
  const supabase = createClient();
  const channel: RealtimeChannel = supabase.channel(LIVE_FEED_CHANNEL);

  channel
    .on("broadcast", { event: LIVE_BROADCAST_EVENT }, (message) => {
      onUpdate(extractBroadcastPayload(message as BroadcastEnvelope));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ surface: "live-center" });
      }
    });

  return () => {
    void channel.untrack();
    void supabase.removeChannel(channel);
  };
}
