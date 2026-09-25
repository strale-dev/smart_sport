"use client";

import { BrowserPushSwitch } from "@/components/notifications/BrowserPushSwitch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PushPermissionPromptProps = {
  initialNotifyPush: boolean;
  dismissedAt: string | null;
};

export function PushPermissionPrompt({
  initialNotifyPush,
  dismissedAt,
}: PushPermissionPromptProps) {
  const visible = !initialNotifyPush && !dismissedAt;

  if (!visible) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Stay updated in the background
        </CardTitle>
        <CardDescription>
          Enable browser notifications so you do not miss goals and full-time
          results for teams you follow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BrowserPushSwitch initialEnabled={initialNotifyPush} />
      </CardContent>
    </Card>
  );
}
