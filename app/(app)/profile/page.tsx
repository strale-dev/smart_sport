import type { Metadata } from "next";
import Link from "next/link";
import { CreditCardIcon, UserIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Account settings and subscription management.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="size-4" aria-hidden />
            Preferences
          </CardTitle>
          <CardDescription>
            Display name, avatar, timezone, and notifications arrive in a later
            release.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCardIcon className="size-4" aria-hidden />
            Subscription
          </CardTitle>
          <CardDescription>
            Start your 7-day Premium trial or manage billing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/profile/subscription"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Manage subscription
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
