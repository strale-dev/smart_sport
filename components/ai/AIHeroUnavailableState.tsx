import { SparklesIcon } from "lucide-react";

import { AIHeroShell } from "@/components/ai/AIHeroShell";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AIHeroUnavailableStateProps = {
  title?: string;
  description?: string;
};

export function AIHeroUnavailableState({
  title = "Pre-match analysis unavailable",
  description = "We do not have a stored pre-match AI analysis for this fixture.",
}: AIHeroUnavailableStateProps) {
  return (
    <AIHeroShell
      variant="plain"
      className="border-border/70 bg-card/50 from-card/50 to-card/50 ring-border/50"
    >
      <CardHeader className="gap-2">
        <div className="flex items-center gap-2">
          <SparklesIcon
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
          <CardTitle className="font-heading text-lg">{title}</CardTitle>
        </div>
        <CardDescription className="max-w-lg">{description}</CardDescription>
      </CardHeader>
    </AIHeroShell>
  );
}
