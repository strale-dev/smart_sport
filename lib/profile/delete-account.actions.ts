"use server";

import { readSubscriptionSummaryForUser } from "@/lib/billing/subscription-summary";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/user";

export type DeleteAccountResult =
  | { ok: true }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "DELETE_FAILED";
    };

async function removeAvatarObjects(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: objects, error: listError } = await admin.storage
    .from("avatars")
    .list(userId);

  if (listError || !objects?.length) {
    return;
  }

  const paths = objects.map((object) => `${userId}/${object.name}`);
  await admin.storage.from("avatars").remove(paths);
}

export async function deleteAccount(): Promise<DeleteAccountResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  try {
    const summary = await readSubscriptionSummaryForUser(user.id);
    if (
      summary.isPremium &&
      (summary.subscriptionStatus === "ACTIVE" ||
        summary.subscriptionStatus === "TRIALING")
    ) {
      console.warn(
        "[deleteAccount] User deleted with active subscription; LemonSqueezy may still bill until cancelled in portal.",
        { userId: user.id, status: summary.subscriptionStatus }
      );
    }

    await removeAvatarObjects(user.id);

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("[deleteAccount] admin.deleteUser failed:", error.message);
      return { ok: false, code: "DELETE_FAILED" };
    }

    return { ok: true };
  } catch (error) {
    console.error("[deleteAccount] unexpected failure:", error);
    return { ok: false, code: "DELETE_FAILED" };
  }
}
