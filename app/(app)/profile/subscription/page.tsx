import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ManageBillingButton } from "@/components/billing/ManageBillingButton";
import { StartTrialButton } from "@/components/billing/StartTrialButton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { readSubscriptionSummaryForUser } from "@/lib/billing/subscription-summary";
import { getCurrentUser } from "@/lib/supabase/user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Subscription",
};

function formatDate(iso: string | null): string | null {
  if (!iso) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function ProfileSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnTo=/profile/subscription");
  }

  const summary = await readSubscriptionSummaryForUser(user.id);
  const params = await searchParams;
  const checkoutSuccess = params.checkout === "success";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">Subscription</h1>
        <p className="text-muted-foreground text-sm">
          Manage your Premium plan and billing details.
        </p>
      </div>

      {checkoutSuccess ? (
        <Card className="border-success/30 bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Checkout complete</CardTitle>
            <CardDescription>
              If payment succeeded, Premium activates within a minute once our
              billing webhook processes. Refresh this page shortly.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle>Current plan</CardTitle>
            <CardDescription>
              {summary.isPremium
                ? "You have access to Premium features."
                : "You are on the Free plan."}
            </CardDescription>
          </div>
          <Badge variant={summary.isPremium ? "default" : "secondary"}>
            {summary.isPremium ? "Premium" : "Free"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary.subscriptionStatus ? (
            <p className="text-muted-foreground text-sm">
              Status:{" "}
              <span className="text-foreground font-medium">
                {summary.subscriptionStatus.replaceAll("_", " ")}
              </span>
            </p>
          ) : null}
          {summary.trialEndsAt ? (
            <p className="text-muted-foreground text-sm">
              Trial ends: {formatDate(summary.trialEndsAt)}
            </p>
          ) : null}
          {summary.renewsAt ? (
            <p className="text-muted-foreground text-sm">
              Renews: {formatDate(summary.renewsAt)}
            </p>
          ) : null}
          {summary.priceAmount != null ? (
            <p className="text-muted-foreground text-sm">
              Price: €{summary.priceAmount.toFixed(2)}
              {summary.priceCurrency ? ` ${summary.priceCurrency}` : ""}/mo
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            {summary.isPremium ? <ManageBillingButton /> : <StartTrialButton />}
            <Link
              href="/pricing"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              View pricing
            </Link>
          </div>
        </CardContent>
      </Card>

      <Link
        href="/profile"
        className={cn(buttonVariants({ variant: "link" }), "px-0")}
      >
        Back to profile
      </Link>
    </div>
  );
}
