import { SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AIHeroComingSoonCard() {
  return (
    <Card className="border-primary/20 bg-card/70 ring-primary/10 min-h-[min(28vh,14rem)] w-full ring-1">
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
    </Card>
  );
}
