import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function MatchAnalyticsCard({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card
      data-slot="match-analytics-card"
      size="sm"
      className={cn("w-full", className)}
      {...props}
    />
  );
}

function MatchCardTitle({
  className,
  ...props
}: React.ComponentProps<typeof CardTitle>) {
  return (
    <CardTitle className={cn("font-heading text-sm", className)} {...props} />
  );
}

function MatchCardDescription({
  className,
  ...props
}: React.ComponentProps<typeof CardDescription>) {
  return <CardDescription className={className} {...props} />;
}

export {
  MatchAnalyticsCard,
  MatchCardDescription,
  MatchCardTitle,
  CardContent as MatchCardContent,
  CardFooter as MatchCardFooter,
  CardHeader as MatchCardHeader,
};
