import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type MobileNavItemProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
};

export function mobileNavItemClass(active: boolean) {
  return cn(
    "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 transition-all duration-200",
    active
      ? "text-foreground font-medium"
      : "text-muted-foreground active:scale-95"
  );
}

export function mobileNavIconClass(active: boolean) {
  return cn(
    "flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-200",
    active && "bg-primary/15 text-primary scale-110"
  );
}

export function MobileNavLinkItem({
  href,
  icon: Icon,
  label,
  active = false,
}: MobileNavItemProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
      className={mobileNavItemClass(active)}
    >
      <span className={mobileNavIconClass(active)}>
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="sr-only">{label}</span>
    </Link>
  );
}
