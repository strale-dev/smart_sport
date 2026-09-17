import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCardIcon, SettingsIcon } from "lucide-react";

import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { ProfileIdentityForm } from "@/components/profile/ProfileIdentityForm";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { readSubscriptionSummaryForUser } from "@/lib/billing/subscription-summary";
import { readProfileForUser } from "@/lib/services/userService";
import { getCurrentUser } from "@/lib/supabase/user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnTo=/profile");
  }

  const [profile, subscription] = await Promise.all([
    readProfileForUser(user.id),
    readSubscriptionSummaryForUser(user.id),
  ]);

  if (!profile) {
    redirect("/login?returnTo=/profile");
  }

  const displayName =
    profile.displayName?.trim() || profile.email.split("@")[0] || "Account";

  const hasActiveSubscription =
    subscription.isPremium &&
    (subscription.subscriptionStatus === "ACTIVE" ||
      subscription.subscriptionStatus === "TRIALING");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Your identity and account settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photo</CardTitle>
          <CardDescription>Shown in the account menu when set.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader
            userId={user.id}
            displayName={displayName}
            avatarUrl={profile.avatarUrl}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileIdentityForm
            email={profile.email}
            displayName={displayName}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SettingsIcon className="size-4" aria-hidden />
            Preferences
          </CardTitle>
          <CardDescription>
            Timezone, league, notifications, and sound.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/profile/preferences"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Open preferences
          </Link>
        </CardContent>
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

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">Delete account</CardTitle>
          <CardDescription>
            Permanently remove your account and personal data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog hasActiveSubscription={hasActiveSubscription} />
        </CardContent>
      </Card>
    </div>
  );
}
