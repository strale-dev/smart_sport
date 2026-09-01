"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountMenu } from "@/components/auth/AccountMenu";
import { AuthNavActions } from "@/components/auth/AuthNavActions";
import { Wordmark } from "@/components/brand/Wordmark";
import { AppNavLink } from "@/components/layout/AppNavLink";
import { APP_NAV_ITEMS } from "@/lib/navigation/app-nav";
import type { AuthUserView } from "@/lib/supabase/user";

type TopNavProps = {
  user: AuthUserView | null;
};

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();
  const homeHref = user ? "/dashboard" : "/";

  return (
    <header className="border-border bg-background/95 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-3">
        <Link
          href={homeHref}
          aria-label="Scorence home"
          className="transition-opacity hover:opacity-80 md:justify-self-start"
        >
          <Wordmark size="nav" />
        </Link>

        <nav
          aria-label="Primary"
          className="bg-muted/40 hidden items-center gap-0.5 rounded-full p-1 md:flex md:justify-self-center"
        >
          {APP_NAV_ITEMS.map((item) => (
            <AppNavLink key={item.href} item={item} variant="pill" showIcon />
          ))}
        </nav>

        <div className="hidden shrink-0 items-center md:col-start-3 md:flex md:justify-self-end">
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <AuthNavActions returnTo={pathname} />
          )}
        </div>
      </div>
    </header>
  );
}
