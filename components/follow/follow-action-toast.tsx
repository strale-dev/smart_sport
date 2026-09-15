"use client";

import { toast } from "@/components/ui/toast";
import type { FollowActionErrorCode } from "@/lib/follow/actions";

export function showFollowActionErrorToast(
  code: FollowActionErrorCode,
  message?: string
) {
  if (code === "FOLLOW_LIMIT_REACHED") {
    toast.add({
      type: "error",
      title: "Follow limit reached",
      description:
        "Upgrade to Premium for unlimited follows. Open Pricing from the menu or visit /pricing.",
    });
    return;
  }

  if (code === "ENTITY_NOT_FOUND") {
    toast.add({
      type: "error",
      title: "Not available yet",
      description:
        message ??
        "This item is not in our database yet. Try again after the next sync.",
    });
    return;
  }

  if (code === "SIGN_IN_REQUIRED") {
    toast.add({
      type: "info",
      title: "Sign in required",
      description: "Sign in to follow teams, players, and leagues.",
    });
    return;
  }

  toast.add({
    type: "error",
    title: "Something went wrong",
    description: message ?? "Please try again in a moment.",
  });
}
