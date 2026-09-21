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
          {isGenerating
            ? "Building the shared pre-match analysis for this fixture. The same insight is shown to every signed-in user once it is ready."
            : "Pre-match analysis is not ready yet. You can retry loading the shared analysis."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {!isGenerating ? (
          <Button onClick={onGenerate}>Retry analysis</Button>
        ) : null}
      </CardContent>
    </AIHeroShell>
  );
}
