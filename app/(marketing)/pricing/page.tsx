import type { Metadata } from "next";
import Link from "next/link";

import { StartTrialButton } from "@/components/billing/StartTrialButton";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Scorence Premium — €2.99/month with a 7-day free trial. Unlimited AI football intelligence.",
};

const premiumFeatures = [
  "Unlimited AI match insights (fair-use protected)",
  "Deeper pre-match and live AI analysis",
  "Higher live refresh cadence on meaningful events",
  "Form last 10, H2H same competition, match momentum, full team comparison",
  "FIFA-style attribute radar on player profiles",
  "Unlimited team and player follows",
] as const;

const freeFeatures = [
  "5 AI predictions per day",
  "Basic match stats, form last 5, and all-competition H2H",
  "Live scores while viewing",
  "Follow up to 2 live matches at once",
] as const;

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 md:py-16">
      <div className="mb-10 space-y-3 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Simple premium pricing
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-base md:text-lg">
          Start with a 7-day free trial. Your card is required upfront so there
          is no interruption when trial ends — cancel anytime during trial if
          Premium is not for you.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>For exploring Scorence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-heading text-3xl font-semibold">€0</p>
            <ul className="text-muted-foreground space-y-2 text-sm">
              {freeFeatures.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            {!user ? (
              <Link
                href="/signup?returnTo=/pricing"
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Create free account
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-primary/30 ring-primary/15 ring-1">
          <CardHeader>
            <CardTitle>Premium</CardTitle>
            <CardDescription>
              Launch price — grandfathered forever
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-heading text-3xl font-semibold">
                €2.99
                <span className="text-muted-foreground text-base font-normal">
                  /month
                </span>
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                7-day free trial · EUR only · early adopters keep €2.99 even
                when public price increases
              </p>
            </div>
            <ul className="text-muted-foreground space-y-2 text-sm">
              {premiumFeatures.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            {user ? (
              <StartTrialButton />
            ) : (
              <Link
                href="/login?returnTo=/pricing"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full sm:w-auto"
                )}
              >
                Sign in to start trial
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
