import Link from "next/link";

import { AccountMenu } from "@/components/auth/AccountMenu";
import { AuthNavActions } from "@/components/auth/AuthNavActions";
import { Wordmark } from "@/components/brand/Wordmark";
import { buttonVariants } from "@/components/ui/button";
import type { AuthUserView } from "@/lib/supabase/user";
import { cn } from "@/lib/utils";

type MarketingHeaderProps = {
  className?: string;
  user?: AuthUserView | null;
};

const marketingLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Waitlist", href: "/#waitlist" },
] as const;

export function MarketingHeader({ className, user }: MarketingHeaderProps) {
  return (
    <header
      className={cn(
        "border-border/60 bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur-md",
        className
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-3">
        <Link
          href="/"
          aria-label="Scorence home"
          className="shrink-0 transition-opacity hover:opacity-80 md:justify-self-start"
        >
          <Wordmark size="nav" />
        </Link>

        <nav
          aria-label="Marketing"
          className="bg-muted/40 hidden items-center gap-0.5 rounded-full p-1 sm:flex md:justify-self-center"
        >
          {marketingLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:bg-background/70 hover:text-foreground rounded-full px-3 py-1.5 text-sm transition-all duration-200 hover:scale-[1.02]"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "rounded-full"
              )}
            >
              Open app
            </Link>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center md:col-start-3 md:justify-self-end">
          {user ? <AccountMenu user={user} /> : <AuthNavActions returnTo="/" />}
        </div>
      </div>
    </header>
  );
}
