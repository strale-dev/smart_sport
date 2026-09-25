"use client";

import { useCallback, useState } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { publicEnv } from "@/lib/env.client";
import {
  isPushSupported,
  subscribeToPushNotifications,
  syncPushSubscriptionWithServer,
  unsubscribePushOnServer,
} from "@/lib/push/client";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";

type BrowserPushSwitchProps = {
  initialEnabled: boolean;
};

export function BrowserPushSwitch({ initialEnabled }: BrowserPushSwitchProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const vapidKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const handleChange = useCallback(
    async (next: boolean) => {
      if (busy) {
        return;
      }

      if (!isPushSupported()) {
        toast.add({
          type: "error",
          title: "Browser notifications unavailable",
          description: "This browser does not support web push notifications.",
        });
        return;
      }

      if (next && !vapidKey) {
        toast.add({
          type: "error",
          title: "Push not configured",
          description: "Web push is not enabled on this environment yet.",
        });
        return;
      }

      setBusy(true);
      try {
        if (next) {
          const subscription = await subscribeToPushNotifications(vapidKey!);
          if (!subscription) {
            toast.add({
              type: "error",
              title: "Permission denied",
              description:
                "Allow notifications in your browser to enable push.",
            });
            return;
          }

          const synced = await syncPushSubscriptionWithServer(subscription);
          if (!synced) {
            toast.add({
              type: "error",
              title: "Could not save subscription",
              description: "Try again from Preferences in a moment.",
            });
            return;
          }

          setEnabled(true);
          void captureClientEvent(POSTHOG_EVENTS.pushSubscribed);
        } else {
          const registration =
            await navigator.serviceWorker.getRegistration("/");
          const subscription =
            await registration?.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
            await unsubscribePushOnServer(subscription.endpoint);
          } else {
            await unsubscribePushOnServer();
          }
          setEnabled(false);
          void captureClientEvent(POSTHOG_EVENTS.pushUnsubscribed);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, vapidKey]
  );

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor="pref-notify-push" className="text-sm font-medium">
          Browser notifications
        </Label>
        <p className="text-muted-foreground text-sm">
          Receive the same alerts when Scorence is in the background (goals,
          full-time, lineups, and more).
        </p>
      </div>
      <Switch
        id="pref-notify-push"
        checked={enabled}
        disabled={busy}
        onCheckedChange={(checked) => void handleChange(checked)}
      />
    </div>
  );
}
