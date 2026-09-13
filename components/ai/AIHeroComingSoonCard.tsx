import { SparklesIcon } from "lucide-react";

import { AIHeroShell } from "@/components/ai/AIHeroShell";
import { Badge } from "@/components/ui/badge";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AIHeroComingSoonCard() {
  return (
    <AIHeroShell variant="plain">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SparklesIcon
            aria-hidden="true"
            className="text-primary size-4 shrink-0"
          />
          <CardTitle className="font-heading text-lg">
            AI match analysis
          </CardTitle>
          <Badge variant="outline">Coming soon</Badge>
        </div>
        <CardDescription className="max-w-lg">
          Win probabilities, key factors, and analyst-style explanations will
          appear here once the AI engine launches in a future update.
        </CardDescription>
      </CardHeader>
    </AIHeroShell>
  );
}
