import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  countUnreadNotifications,
  getNotificationsPage,
} from "@/lib/notifications/inbox";

type NotificationBellContainerProps = {
  userId: string;
  className?: string;
};

export async function NotificationBellContainer({
  userId,
  className,
}: NotificationBellContainerProps) {
  const [page, unreadCount] = await Promise.all([
    getNotificationsPage(userId, { limit: 25 }),
    countUnreadNotifications(userId),
  ]);

  return (
    <NotificationBell
      userId={userId}
      initialItems={page.items}
      initialUnreadCount={unreadCount}
      initialNextCursor={page.nextCursor}
      className={className}
    />
  );
}
