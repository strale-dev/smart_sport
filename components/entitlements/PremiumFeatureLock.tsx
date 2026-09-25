"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { LockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
type PremiumFeatureLockProps = {
  feature: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function PremiumFeatureLock({
  feature,
  title,
  description,
  children,
}: PremiumFeatureLockProps) {
  useEffect(() => {
    void captureClientEvent(POSTHOG_EVENTS.premiumAnalyticsLockedView, {
      feature,
    });
  }, [feature]);

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div
        aria-hidden="true"
        className="pointer-events-none opacity-40 blur-sm select-none"
      >
        {children}
      </div>
      <div className="bg-background/85 absolute inset-0 backdrop-blur-[2px]" />
      <div className="relative z-10 flex flex-col items-start gap-3 p-4">
        <div className="flex items-center gap-2">
          <LockIcon className="text-primary size-4" aria-hidden />
          <CardTitle className="font-heading text-base">{title}</CardTitle>
        </div>
        <CardDescription className="max-w-md">{description}</CardDescription>
        <Button
          nativeButton={false}
          size="sm"
          render={
            <Link
              href="/pricing"
              onClick={() =>
                void captureClientEvent(
                  POSTHOG_EVENTS.premiumAnalyticsUpgradeClick,
                  { feature }
                )
              }
            />
          }
        >
          Upgrade to Premium
        </Button>
      </div>
    </div>
  );
}
