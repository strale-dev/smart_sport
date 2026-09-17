"use client";

import Link from "next/link";
import { BellOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fixtureProviderIdFromPayload } from "@/lib/notifications/fixture-link";
import type { NotificationInboxItem } from "@/lib/notifications/inbox";
import { cn } from "@/lib/utils";

type NotificationsListDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NotificationInboxItem[];
  unreadCount: number;
  isPending?: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NotificationsListDrawer({
  open,
  onOpenChange,
  items,
  unreadCount,
  isPending = false,
  hasMore,
  onLoadMore,
  onMarkRead,
  onMarkAllRead,
}: NotificationsListDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-border border-b pb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </SheetDescription>
            </div>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                disabled={isPending}
                onClick={onMarkAllRead}
              >
                Mark all read
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center text-sm">
            <BellOffIcon className="size-8 opacity-50" aria-hidden />
            <p>No notifications yet.</p>
            <p className="text-xs">
              Follow teams to get goals, full-time, and lineup alerts.
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <ul className="divide-border flex flex-col divide-y">
              {items.map((item) => {
                const fixtureProviderId = fixtureProviderIdFromPayload(
                  item.payload
                );
                const href = fixtureProviderId
                  ? `/matches/${fixtureProviderId}`
                  : null;
                const unread = item.read_at == null;

                const content = (
                  <>
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        unread ? "font-medium" : "text-muted-foreground"
                      )}
                    >
                      {item.title}
                    </p>
                    {item.body ? (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {item.body}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {formatRelativeTime(item.created_at)}
                    </p>
                  </>
                );

                return (
                  <li key={item.id}>
                    {href ? (
                      <Link
                        href={href}
                        className="hover:bg-muted/40 block px-1 py-3 transition-colors"
                        onClick={() => {
                          if (unread) {
                            onMarkRead(item.id);
                          }
                          onOpenChange(false);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="hover:bg-muted/40 block w-full px-1 py-3 text-left transition-colors"
                        onClick={() => {
                          if (unread) {
                            onMarkRead(item.id);
                          }
                        }}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {hasMore ? (
              <div className="py-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isPending}
                  onClick={onLoadMore}
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
