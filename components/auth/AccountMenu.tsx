"use client";

import Link from "next/link";
import {
  CreditCardIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";

import { SignOutMenuItem } from "@/components/auth/SignOutMenuItem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  mobileNavIconClass,
  mobileNavItemClass,
} from "@/components/layout/MobileNavItem";
import type { AuthUserView } from "@/lib/supabase/user";
import { cn } from "@/lib/utils";

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

type AccountMenuProps = {
  user: AuthUserView;
  variant?: "header" | "tab";
  active?: boolean;
};

export function AccountMenu({
  user,
  variant = "header",
  active = false,
}: AccountMenuProps) {
  const initials = getInitials(user.displayName);

  const avatarMark = (
    <Avatar size="sm" className="size-full">
      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
      <AvatarFallback className="text-xs font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  const trigger =
    variant === "header" ? (
      <Button
        variant="outline"
        size="icon-sm"
        className="size-8 overflow-hidden rounded-full p-0"
        aria-label="Account menu"
      />
    ) : (
      <button
        type="button"
        aria-label="Account menu"
        className={cn(
          mobileNavItemClass(active),
          "w-full border-0 bg-transparent"
        )}
      />
    );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger}>
        {variant === "header" ? (
          avatarMark
        ) : (
          <>
            <span className={mobileNavIconClass(active)}>{avatarMark}</span>
            <span className="sr-only">Account</span>
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "tab" ? "center" : "end"}
        side={variant === "tab" ? "top" : "bottom"}
        sideOffset={variant === "tab" ? 12 : 4}
        className="min-w-52"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5 font-normal">
            <span className="block truncate">{user.displayName}</span>
            {user.email ? (
              <span className="text-muted-foreground block truncate text-xs font-normal">
                {user.email}
              </span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/dashboard" />}>
            <LayoutDashboardIcon />
            Open app
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/profile" />}>
            <UserIcon />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/profile/preferences" />}>
            <SettingsIcon />
            Preferences
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/profile/subscription" />}>
            <CreditCardIcon />
            Subscription
          </DropdownMenuItem>
          <SignOutMenuItem />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (variant === "tab") {
    return <div className="flex min-w-0 flex-1">{menu}</div>;
  }

  return menu;
}
