/**
 * Optional Phase 6 follow/favorites integration smoke.
 * Requires PHASE6_QA_USER_ID and at least one team row in Postgres.
 *
 * Usage: PHASE6_QA_USER_ID=<uuid> npm run phase6:follow-smoke
 */

import { readFollowedTeamsForUser } from "@/lib/ingestion/db-read";
import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const userId = process.env.PHASE6_QA_USER_ID?.trim();
  if (!userId) {
    console.error("PHASE6_QA_USER_ID is required for phase6:follow-smoke");
    process.exit(1);
  }

  const admin = createAdminClient();
  const { data: team, error: teamError } = await admin
    .from("teams")
    .select("id, provider_id")
    .limit(1)
    .maybeSingle();

  if (teamError || !team) {
    console.error("No team row available for follow smoke:", teamError);
    process.exit(1);
  }

  await admin
    .from("follows")
    .delete()
    .eq("user_id", userId)
    .eq("object_type", "TEAM")
    .eq("team_id", team.id);

  const { error: insertError } = await admin.from("follows").insert({
    user_id: userId,
    object_type: "TEAM",
    team_id: team.id,
  });

  if (insertError) {
    console.error("Failed to insert follow row:", insertError.message);
    process.exit(1);
  }

  const followed = await readFollowedTeamsForUser(userId);
  const seen = followed.some((row) => row.id === team.id);

  await admin
    .from("follows")
    .delete()
    .eq("user_id", userId)
    .eq("object_type", "TEAM")
    .eq("team_id", team.id);

  if (!seen) {
    console.error("readFollowedTeamsForUser did not return inserted team");
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId,
        teamProviderId: team.provider_id,
        followedCount: followed.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("phase6:follow-smoke failed:", error);
  process.exit(1);
});
