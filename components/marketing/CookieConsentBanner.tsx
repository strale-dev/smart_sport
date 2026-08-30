"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/useCookieConsent";

type CookieConsentBannerProps = {
  onManage: () => void;
};

export function CookieConsentBanner({ onManage }: CookieConsentBannerProps) {
  const { acceptAll, rejectNonEssential } = useCookieConsent();

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="border-border bg-card/95 fixed inset-x-0 bottom-0 z-50 border-t p-4 shadow-lg backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm leading-relaxed">
          We use necessary cookies for security and optional analytics cookies
          (PostHog, EU) to understand how visitors use Scorence. Marketing
          cookies are not used in the MVP.{" "}
          <Link href="/privacy" className="text-info hover:underline">
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onManage}>
            Manage preferences
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={rejectNonEssential}
          >
            Reject non-essential
          </Button>
          <Button type="button" size="sm" onClick={acceptAll}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
