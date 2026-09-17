"use client";

import { BellIcon } from "lucide-react";
import { useState } from "react";

import { NotificationsListDrawer } from "@/components/notifications/list-drawer";
import { Button } from "@/components/ui/button";
import { useNotificationsInbox } from "@/hooks/useNotificationsInbox";
import type { NotificationInboxItem } from "@/lib/notifications/inbox";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  userId: string;
  initialItems: NotificationInboxItem[];
  initialUnreadCount: number;
  initialNextCursor: string | null;
  className?: string;
};

export function NotificationBell({
  userId,
  initialItems,
  initialUnreadCount,
  initialNextCursor,
  className,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const {
    items,
    unreadCount,
    nextCursor,
    isPending,
    loadMore,
    markRead,
    markAllRead,
  } = useNotificationsInbox({
    userId,
    initialItems,
    initialUnreadCount,
    initialNextCursor,
  });

  const badge =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("relative rounded-full", className)}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        onClick={() => setOpen(true)}
      >
        <BellIcon className="size-4" aria-hidden />
        {badge ? (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-medium">
            {badge}
          </span>
        ) : null}
      </Button>

      <NotificationsListDrawer
        open={open}
        onOpenChange={setOpen}
        items={items}
        unreadCount={unreadCount}
        isPending={isPending}
        hasMore={nextCursor != null}
        onLoadMore={loadMore}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </>
  );
}
