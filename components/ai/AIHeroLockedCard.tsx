import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loginHref } from "@/lib/auth/return-to";

type AIHeroLockedCardProps = {
  returnTo: string;
};

export function AIHeroLockedCard({ returnTo }: AIHeroLockedCardProps) {
  const signupHref = `/signup?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <Card className="border-primary/20 bg-card/70 ring-primary/10 relative min-h-[min(28vh,14rem)] w-full overflow-hidden ring-1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col gap-4 p-6 opacity-40 blur-sm select-none"
      >
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>

      <div className="bg-background/80 absolute inset-0 backdrop-blur-[2px]" />

      <CardHeader className="relative z-10 gap-2 pb-2">
        <div className="flex items-center gap-2">
          <SparklesIcon
            aria-hidden="true"
            className="text-primary size-4 shrink-0"
          />
          <CardTitle className="font-heading text-lg">
            AI match analysis
          </CardTitle>
        </div>
        <CardDescription className="max-w-lg">
          AI-powered predictions and explanations are launching soon. Create a
          free account to get early access when they go live.
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 flex flex-wrap items-center gap-3 pt-0">
        <Button nativeButton={false} render={<Link href={signupHref} />}>
          Create a free account to be notified when AI predictions go live
        </Button>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={loginHref(returnTo)} />}
        >
          Log in
        </Button>
      </CardContent>
    </Card>
  );
}
