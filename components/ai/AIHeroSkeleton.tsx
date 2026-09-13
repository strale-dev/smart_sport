import { SparklesIcon } from "lucide-react";

import { AIHeroShell } from "@/components/ai/AIHeroShell";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AIHeroSkeleton() {
  return (
    <AIHeroShell variant="plain">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2">
          <SparklesIcon
            aria-hidden="true"
            className="text-primary size-4 shrink-0"
          />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full max-w-xl" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
      </CardContent>
    </AIHeroShell>
  );
}
