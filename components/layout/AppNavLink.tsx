"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isAppNavActive, type AppNavItem } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";

type AppNavLinkProps = {
  item: AppNavItem;
  className?: string;
  showIcon?: boolean;
  variant?: "inline" | "pill";
};

export function AppNavLink({
  item,
  className,
  showIcon = false,
  variant = "inline",
}: AppNavLinkProps) {
  const pathname = usePathname();
  const active = isAppNavActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm transition-all duration-200",
        variant === "pill" &&
          "hover:bg-background/70 hover:text-foreground rounded-full px-3 py-1.5",
        variant === "pill" &&
          active &&
          "bg-background text-foreground ring-border/60 shadow-sm ring-1",
        variant === "pill" &&
          !active &&
          "text-muted-foreground hover:scale-[1.02]",
        variant === "inline" &&
          (active
            ? "text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground"),
        className
      )}
    >
      {showIcon ? (
        <Icon aria-hidden="true" className="size-4 shrink-0" />
      ) : null}
      <span>{item.label}</span>
    </Link>
  );
}
