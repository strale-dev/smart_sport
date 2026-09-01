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
    "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] transition-all duration-200",
    active
      ? "text-foreground font-medium"
      : "text-muted-foreground active:scale-95"
  );
}

export function mobileNavIconClass(active: boolean) {
  return cn(
    "flex size-8 items-center justify-center rounded-full transition-all duration-200",
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
      aria-current={active ? "page" : undefined}
      className={mobileNavItemClass(active)}
    >
      <span className={mobileNavIconClass(active)}>
        <Icon aria-hidden="true" className="size-4" />
      </span>
      {label}
    </Link>
  );
}
