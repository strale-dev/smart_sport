"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserIcon } from "lucide-react";

import { AccountMenu } from "@/components/auth/AccountMenu";
import { MobileNavLinkItem } from "@/components/layout/MobileNavItem";
import { loginHref } from "@/lib/auth/return-to";
import { APP_NAV_ITEMS, isAppNavActive } from "@/lib/navigation/app-nav";
import type { AuthUserView } from "@/lib/supabase/user";

type MobileNavProps = {
  user: AuthUserView | null;
};

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname();
  const profileActive =
    pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <nav
      aria-label="Mobile"
      className="border-border bg-background/95 sticky bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-stretch justify-around px-1">
        {APP_NAV_ITEMS.map((item) => (
          <MobileNavLinkItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isAppNavActive(pathname, item)}
          />
        ))}

        {user ? (
          <AccountMenu user={user} variant="tab" active={profileActive} />
        ) : (
          <MobileNavLinkItem
            href={loginHref(pathname)}
            icon={UserIcon}
            label="Account"
            active={false}
          />
        )}
      </div>
    </nav>
  );
}
