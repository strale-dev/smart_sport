import type { NextRequest } from "next/server";

import { runCronRoute } from "@/lib/ingestion/cron-run";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePlayerBiography } from "@/lib/wikipedia/player-bio-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "sync-player-bios",
    lockTtlSeconds: 600,
    run: async () => {
      const admin = createAdminClient();

      const { data: followedPlayers, error: followError } = await admin
        .from("follows")
        .select("player_id")
        .eq("object_type", "PLAYER")
        .not("player_id", "is", null)
        .limit(40);

      if (followError) {
        throw new Error(followError.message);
      }

      let processed = 0;
      for (const row of followedPlayers ?? []) {
        if (!row.player_id) {
          continue;
        }

        const { data: player, error: playerError } = await admin
          .from("players")
          .select("id, full_name, nationality")
          .eq("id", row.player_id)
          .maybeSingle();

        if (playerError || !player) {
          continue;
        }

        await ensurePlayerBiography({
          playerUuid: player.id,
          fullName: player.full_name,
          nationality: player.nationality,
        });
        processed += 1;
      }

      return {
        ok: true,
        job: "sync-player-bios",
        processed,
      };
    },
  });
}
