import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type NotificationInboxItem = Pick<
  Database["public"]["Tables"]["notifications"]["Row"],
  | "id"
  | "kind"
  | "title"
  | "body"
  | "fixture_id"
  | "team_id"
  | "player_id"
  | "payload"
  | "read_at"
  | "created_at"
>;

export type NotificationsPage = {
  items: NotificationInboxItem[];
  nextCursor: string | null;
};

const DEFAULT_PAGE_SIZE = 30;

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`, "utf8").toString("base64url");
}

function decodeCursor(
  cursor: string
): { createdAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const separator = raw.indexOf("|");
    if (separator <= 0) {
      return null;
    }
    const createdAt = raw.slice(0, separator);
    const id = raw.slice(separator + 1);
    if (!createdAt || !id) {
      return null;
    }
    return { createdAt, id };
  } catch {
    return null;
  }
}

export async function getNotificationsPage(
  userId: string,
  options?: { cursor?: string | null; limit?: number }
): Promise<NotificationsPage> {
  const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let query = supabase
    .from("notifications")
    .select(
      "id, kind, title, body, fixture_id, team_id, player_id, payload, read_at, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  const decoded = options?.cursor ? decodeCursor(options.cursor) : null;
  if (decoded) {
    query = query.or(
      `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`notifications_page_failed: ${error.message}`);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);

  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null,
  };
}

export async function countUnreadNotifications(
  userId: string
): Promise<number> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(`notifications_unread_count_failed: ${error.message}`);
  }

  return count ?? 0;
}

export async function markNotificationReadForUser(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const readAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`notification_mark_read_failed: ${error.message}`);
  }

  return data != null;
}

export async function markAllNotificationsReadForUser(
  userId: string
): Promise<number> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const readAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id");

  if (error) {
    throw new Error(`notifications_mark_all_read_failed: ${error.message}`);
  }

  return data?.length ?? 0;
}
