import type { AiConfidence } from "@/types/prediction";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const confidenceConfig: Record<
  AiConfidence,
  {
    label: string;
    variant: "success" | "warning" | "outline";
  }
> = {
  HIGH: { label: "High confidence", variant: "success" },
  MEDIUM: { label: "Medium confidence", variant: "warning" },
  LOW: { label: "Low confidence", variant: "outline" },
};

type ConfidenceBadgeProps = {
  confidence: AiConfidence;
  className?: string;
};

export function ConfidenceBadge({
  confidence,
  className,
}: ConfidenceBadgeProps) {
  const config = confidenceConfig[confidence];

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
