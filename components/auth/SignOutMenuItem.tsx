"use client";

import { LogOutIcon } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import { resetAuthAnalytics } from "@/lib/posthog/auth";

export function SignOutMenuItem() {
  async function handleSignOut() {
    await resetAuthAnalytics();
    await signOut();
  }

  return (
    <DropdownMenuItem onClick={() => void handleSignOut()}>
      <LogOutIcon />
      Sign out
    </DropdownMenuItem>
  );
}
