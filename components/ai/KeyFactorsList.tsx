import type { AIInsightPayload } from "@/lib/ai/schemas";

import { cn } from "@/lib/utils";

type KeyFactorsListProps = {
  factors: AIInsightPayload["keyFactors"];
  limit?: number;
  className?: string;
};

export function KeyFactorsList({
  factors,
  limit,
  className,
}: KeyFactorsListProps) {
  const visibleFactors = limit != null ? factors.slice(0, limit) : factors;
  const maxWeight = Math.max(
    ...visibleFactors.map((factor) => factor.weight),
    1
  );

  return (
    <ul className={cn("space-y-3", className)}>
      {visibleFactors.map((factor) => (
        <li key={factor.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{factor.label}</span>
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {Math.round(factor.weight * 100)}%
            </span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${(factor.weight / maxWeight) * 100}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {factor.evidence}
          </p>
        </li>
      ))}
    </ul>
  );
}
