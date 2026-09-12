"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  LIVE_BROADCAST_EVENT,
  LIVE_FEED_CHANNEL,
  matchChannel,
} from "@/lib/live/channels";
import { createClient } from "@/lib/supabase/client";

export function subscribeMatchBroadcast(
  fixtureProviderId: number,
  onUpdate: () => void
): () => void {
  const supabase = createClient();
  const channelName = matchChannel(fixtureProviderId);
  const channel: RealtimeChannel = supabase.channel(channelName);

  channel
    .on("broadcast", { event: LIVE_BROADCAST_EVENT }, () => {
      onUpdate();
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

export function subscribeLiveFeedBroadcast(onUpdate: () => void): () => void {
  const supabase = createClient();
  const channel: RealtimeChannel = supabase.channel(LIVE_FEED_CHANNEL);

  channel
    .on("broadcast", { event: LIVE_BROADCAST_EVENT }, () => {
      onUpdate();
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
