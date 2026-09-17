export const NOTIFICATION_BROADCAST_EVENT = "notification";

export function userNotificationsChannel(userId: string): string {
  return `user:${userId}:notifications`;
}

export type NotificationBroadcastPayload = {
  notificationId: string;
  kind: string;
  createdAt: string;
};
