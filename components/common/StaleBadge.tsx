"use client";

import { useSyncExternalStore } from "react";
import { ClockIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type StaleBadgeLanguage = "en" | "sr";

type StaleBadgeProps = {
  updatedAt?: Date | string | null;
  staleAfterSeconds?: number;
  /** When set, replaces the age check. The fixtures list passes its own rule. */
  stale?: boolean;
  language?: StaleBadgeLanguage;
  className?: string;
};

function formatRelativeTime(
  date: Date,
  now: number,
  language: StaleBadgeLanguage
): string {
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (language === "sr") {
    if (seconds < 60) {
      return `${seconds} s`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }

    return `${Math.floor(minutes / 60)} h`;
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  return `${Math.floor(minutes / 60)}h ago`;
}

function unknownLabel(language: StaleBadgeLanguage): string {
  return language === "sr" ? "Nepoznata svežina" : "Unknown freshness";
}

function checkingLabel(language: StaleBadgeLanguage): string {
  return language === "sr" ? "Provera svežine…" : "Checking freshness…";
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
  stale,
  language = "en",
  className,
}: StaleBadgeProps) {
  const now = useCurrentTime();

  if (!updatedAt) {
    return (
      <Badge
        variant={stale ? "warning" : "outline"}
        className={cn("gap-1", className)}
      >
        <ClockIcon aria-hidden="true" />
        {unknownLabel(language)}
      </Badge>
    );
  }

  const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

  if (now === 0) {
    return (
      <Badge variant="outline" className={cn("gap-1", className)}>
        <ClockIcon aria-hidden="true" />
        {checkingLabel(language)}
      </Badge>
    );
  }

  const ageSeconds = Math.floor((now - date.getTime()) / 1000);
  const isStale = stale ?? ageSeconds >= staleAfterSeconds;
  const relative = formatRelativeTime(date, now, language);
  const label =
    language === "sr"
      ? `Ažurirano pre ${relative}`
      : isStale
        ? `Stale · ${relative}`
        : `Updated ${relative}`;

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
