import { SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AIHeroMissStateProps = {
  onGenerate: () => void;
  isGenerating?: boolean;
};

export function AIHeroMissState({
  onGenerate,
  isGenerating = false,
}: AIHeroMissStateProps) {
  return (
    <Card className="border-primary/20 bg-card/70 ring-primary/10 min-h-[min(28vh,14rem)] w-full ring-1">
      <CardHeader className="gap-2">
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
          Pre-match analysis is not ready yet for this fixture. Generate it now
          to see win probabilities, key factors, and analyst-style commentary.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating analysis…" : "Generate analysis"}
        </Button>
      </CardContent>
    </Card>
  );
}
