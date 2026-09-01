"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { loginHref } from "@/lib/auth/return-to";
import { cn } from "@/lib/utils";

type AuthNavActionsProps = {
  returnTo: string;
  className?: string;
};

export function AuthNavActions({ returnTo, className }: AuthNavActionsProps) {
  return (
    <nav
      aria-label="Account"
      className={cn("flex items-center gap-2 sm:gap-3", className)}
    >
      <Link
        href={loginHref(returnTo)}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Log in
      </Link>
      <Link
        href={`/signup?returnTo=${encodeURIComponent(returnTo)}`}
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        Sign up
      </Link>
    </nav>
  );
}
