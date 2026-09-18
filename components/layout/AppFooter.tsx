import Link from "next/link";

import { AiDisclaimerText } from "@/components/common/AiDisclaimerText";
import { CookiePreferencesTrigger } from "@/components/marketing/CookieConsentShell";
import { BRAND } from "@/lib/marketing/copy";
import { cn } from "@/lib/utils";

type AppFooterProps = {
  className?: string;
};

export function AppFooter({ className }: AppFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "border-border mt-auto hidden border-t pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:block md:pb-0",
        className
      )}
    >
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <AiDisclaimerText className="max-w-3xl" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
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
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Terms
          </Link>
          <CookiePreferencesTrigger>Cookie settings</CookiePreferencesTrigger>
          <span className="text-muted-foreground">
            © {year} {BRAND.name}
          </span>
        </div>
      </div>
    </footer>
  );
}
