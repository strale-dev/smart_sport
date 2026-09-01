import {
  CalendarDaysIcon,
  HomeIcon,
  RadioIcon,
  StarIcon,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  activePrefixes?: readonly string[];
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: HomeIcon },
  {
    label: "Fixtures",
    href: "/fixtures",
    icon: CalendarDaysIcon,
    activePrefixes: ["/matches"],
  },
  { label: "Live", href: "/live", icon: RadioIcon },
  { label: "Favorites", href: "/favorites", icon: StarIcon },
] as const;

export function isAppNavActive(pathname: string, item: AppNavItem): boolean {
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }

  return (
    item.activePrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    ) ?? false
  );
}
