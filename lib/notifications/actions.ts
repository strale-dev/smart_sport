"use server";

import { revalidatePath } from "next/cache";

import {
  countUnreadNotifications,
  getNotificationsPage,
  markAllNotificationsReadForUser,
  markNotificationReadForUser,
  type NotificationsPage,
} from "@/lib/notifications/inbox";
import { getCurrentUser } from "@/lib/supabase/user";

export type NotificationActionResult =
  | { ok: true }
  | { ok: false; code: "SIGN_IN_REQUIRED" | "UNKNOWN"; message?: string };

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("SIGN_IN_REQUIRED");
  }
  return user.id;
}

export async function fetchUnreadNotificationCount(): Promise<
  number | { ok: false; code: "SIGN_IN_REQUIRED" }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  return countUnreadNotifications(user.id);
}

export async function fetchNotificationsPage(
  cursor?: string | null
): Promise<NotificationsPage | { ok: false; code: "SIGN_IN_REQUIRED" }> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  return getNotificationsPage(user.id, { cursor });
}

export async function markNotificationRead(
  notificationId: string
): Promise<NotificationActionResult> {
  try {
    const userId = await requireUserId();
    await markNotificationReadForUser(userId, notificationId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "SIGN_IN_REQUIRED") {
      return { ok: false, code: "SIGN_IN_REQUIRED" };
    }
    return {
      ok: false,
      code: "UNKNOWN",
      message: error instanceof Error ? error.message : undefined,
    };
  }
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  try {
    const userId = await requireUserId();
    await markAllNotificationsReadForUser(userId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "SIGN_IN_REQUIRED") {
      return { ok: false, code: "SIGN_IN_REQUIRED" };
    }
    return {
      ok: false,
      code: "UNKNOWN",
      message: error instanceof Error ? error.message : undefined,
    };
  }
}
