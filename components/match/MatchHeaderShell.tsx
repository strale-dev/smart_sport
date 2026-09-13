import * as React from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function MatchHeaderShell({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card
      data-slot="match-header-hero"
      className={cn(
        "glass-card border-border/80 from-card/95 to-card/65 ring-foreground/5 w-full overflow-hidden bg-gradient-to-b py-0 ring-1",
        className
      )}
      {...props}
    />
  );
}

function MatchHeaderShellHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return (
    <CardHeader
      className={cn("gap-2 px-6 pt-8 pb-0 sm:px-8 sm:pt-10", className)}
      {...props}
    />
  );
}

function MatchHeaderShellContent({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return (
    <CardContent
      className={cn(
        "space-y-4 px-6 pt-4 pb-8 sm:px-8 sm:pt-5 sm:pb-10",
        className
      )}
      {...props}
    />
  );
}

export { MatchHeaderShell, MatchHeaderShellContent, MatchHeaderShellHeader };
