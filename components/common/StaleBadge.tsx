"use client";

import { useSyncExternalStore } from "react";
import { ClockIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type StaleBadgeProps = {
  updatedAt?: Date | string | null;
  staleAfterSeconds?: number;
  className?: string;
};

function formatRelativeTime(date: Date, now: number): string {
  const seconds = Math.floor((now - date.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function subscribeToTime(onStoreChange: () => void) {
  const intervalId = window.setInterval(onStoreChange, 30_000);
  return () => window.clearInterval(intervalId);
}

function getCurrentTime() {
  return Date.now();
}

function getServerTime() {
  return 0;
}

function useCurrentTime() {
  return useSyncExternalStore(subscribeToTime, getCurrentTime, getServerTime);
}

export function StaleBadge({
  updatedAt,
  staleAfterSeconds = 120,
  className,
}: StaleBadgeProps) {
  const now = useCurrentTime();

  if (!updatedAt) {
    return (
      <Badge variant="outline" className={cn("gap-1", className)}>
        <ClockIcon aria-hidden="true" />
        Unknown freshness
      </Badge>
    );
  }

  const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

  if (now === 0) {
    return (
      <Badge variant="outline" className={cn("gap-1", className)}>
        <ClockIcon aria-hidden="true" />
        Checking freshness…
      </Badge>
    );
  }

  const ageSeconds = Math.floor((now - date.getTime()) / 1000);
  const isStale = ageSeconds >= staleAfterSeconds;
  const label = isStale
    ? `Stale · ${formatRelativeTime(date, now)}`
    : `Updated ${formatRelativeTime(date, now)}`;

  return (
    <Badge
      variant={isStale ? "warning" : "outline"}
      className={cn("gap-1", className)}
    >
      <ClockIcon aria-hidden="true" />
      <span>{label}</span>
    </Badge>
  );
}
