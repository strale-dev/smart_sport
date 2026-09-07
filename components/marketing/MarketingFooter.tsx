import Link from "next/link";

import { CookiePreferencesTrigger } from "@/components/marketing/CookieConsentShell";
import { AI_DISCLAIMER, BRAND, landingCopy } from "@/lib/marketing/copy";
import { cn } from "@/lib/utils";

export function MarketingFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className={cn("border-border border-t", className)}>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <p className="text-muted-foreground max-w-3xl text-xs leading-relaxed">
          {AI_DISCLAIMER}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link
            href="/methodology"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            How our model works
          </Link>
          <Link
            href="/privacy"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>
          <CookiePreferencesTrigger>Cookie settings</CookiePreferencesTrigger>
        </div>
        <p className="text-muted-foreground text-xs">
          © {year} {BRAND.name}. {landingCopy.footer.tagline}
        </p>
      </div>
    </footer>
  );
}
