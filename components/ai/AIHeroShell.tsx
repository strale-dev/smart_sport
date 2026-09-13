import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AIHeroShellProps = React.ComponentProps<typeof Card> & {
  variant?: "default" | "locked" | "plain";
};

function AIHeroShell({
  className,
  variant = "default",
  ...props
}: AIHeroShellProps) {
  return (
    <Card
      data-slot="ai-hero"
      className={cn(
        "min-h-[clamp(12rem,28vh,22rem)] w-full overflow-hidden",
        variant === "default" &&
          "border-primary/20 from-card/90 to-card/60 ring-primary/10 bg-gradient-to-br ring-1",
        variant === "locked" &&
          "border-primary/20 bg-card/70 ring-primary/10 relative ring-1",
        variant === "plain" &&
          "border-primary/20 bg-card/70 ring-primary/10 ring-1",
        className
      )}
      {...props}
    />
  );
}

export { AIHeroShell };
