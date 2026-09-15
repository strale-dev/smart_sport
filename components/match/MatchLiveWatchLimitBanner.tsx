"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LiveWatchErrorCode } from "@/lib/live/watch-client";

type MatchLiveWatchLimitBannerProps = {
  code: LiveWatchErrorCode;
  limit?: number;
  used?: number;
};

function titleForCode(code: LiveWatchErrorCode): string {
  switch (code) {
    case "LIVE_SIMULTANEOUS_LIMIT":
      return "Too many live matches open";
    case "LIVE_DAILY_LIMIT":
    case "AI_LIMIT_REACHED":
      return "Live AI limit reached";
    default:
      return "Live watch unavailable";
  }
}

function descriptionForCode(
  code: LiveWatchErrorCode,
  limit?: number,
  used?: number
): string {
  switch (code) {
    case "LIVE_SIMULTANEOUS_LIMIT":
      return `You can follow at most ${limit ?? 2} live matches at once. Close another live tab to continue. Scores and stats still update below.`;
    case "LIVE_DAILY_LIMIT":
    case "AI_LIMIT_REACHED":
      return `You have used ${used ?? "your"} of ${limit ?? ""} live AI views today. Live AI commentary is paused; upgrade for unlimited access.`;
    default:
      return "Live polling is unavailable. Basic match data may still load from cache.";
  }
}

export function MatchLiveWatchLimitBanner({
  code,
  limit,
  used,
}: MatchLiveWatchLimitBannerProps) {
  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="gap-2 pb-2">
        <CardTitle className="text-base">{titleForCode(code)}</CardTitle>
        <CardDescription>
          {descriptionForCode(code, limit, used)}
        </CardDescription>
      </CardHeader>
      {(code === "LIVE_DAILY_LIMIT" ||
        code === "AI_LIMIT_REACHED" ||
        code === "LIVE_SIMULTANEOUS_LIMIT") && (
        <CardContent className="pt-0">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/pricing" />}
          >
            View plans
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
