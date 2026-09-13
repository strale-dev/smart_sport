import { SparklesIcon } from "lucide-react";

import { AIHeroShell } from "@/components/ai/AIHeroShell";
import { Button } from "@/components/ui/button";
import {
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
    <AIHeroShell variant="plain">
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
    </AIHeroShell>
  );
}
