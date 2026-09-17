"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  fetchNotificationsPage,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/actions";
import type { NotificationInboxItem } from "@/lib/notifications/inbox";
import { subscribeUserNotificationsBroadcast } from "@/lib/notifications/subscribe-broadcast";

type UseNotificationsInboxOptions = {
  userId: string;
  initialItems: NotificationInboxItem[];
  initialUnreadCount: number;
  initialNextCursor: string | null;
};

export function useNotificationsInbox({
  userId,
  initialItems,
  initialUnreadCount,
  initialNextCursor,
}: UseNotificationsInboxOptions) {
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  const refreshFirstPage = useCallback(() => {
    startTransition(async () => {
      const page = await fetchNotificationsPage(null);
      if (!("items" in page)) {
        return;
      }
      const unread = await fetchUnreadNotificationCount();
      setItems(page.items);
      setNextCursor(page.nextCursor);
      if (typeof unread === "number") {
        setUnreadCount(unread);
      }
    });
  }, []);

  useEffect(() => {
    return subscribeUserNotificationsBroadcast(userId, () => {
      refreshFirstPage();
    });
  }, [userId, refreshFirstPage]);

  const loadMore = useCallback(() => {
    if (!nextCursor || isPending) {
      return;
    }

    startTransition(async () => {
      const page = await fetchNotificationsPage(nextCursor);
      if (!("items" in page)) {
        return;
      }
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    });
  }, [isPending, nextCursor]);

  const markRead = useCallback((notificationId: string) => {
    startTransition(async () => {
      const result = await markNotificationRead(notificationId);
      if (!result.ok) {
        return;
      }
      setItems((prev) =>
        prev.map((row) =>
          row.id === notificationId
            ? { ...row, read_at: new Date().toISOString() }
            : row
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    });
  }, []);

  const markAllRead = useCallback(() => {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) {
        return;
      }
      const readAt = new Date().toISOString();
      setItems((prev) => prev.map((row) => ({ ...row, read_at: readAt })));
      setUnreadCount(0);
    });
  }, []);

  return {
    items,
    unreadCount,
    nextCursor,
    isPending,
    loadMore,
    markRead,
    markAllRead,
    refreshFirstPage,
  };
}
