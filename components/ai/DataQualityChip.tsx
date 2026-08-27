import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type DataQuality = "COMPLETE" | "PARTIAL" | "STALE";

const qualityConfig: Record<
  DataQuality,
  {
    label: string;
    variant: "success" | "warning" | "outline";
    icon: typeof CheckCircle2Icon;
  }
> = {
  COMPLETE: {
    label: "Complete data",
    variant: "success",
    icon: CheckCircle2Icon,
  },
  PARTIAL: {
    label: "Partial data",
    variant: "warning",
    icon: AlertTriangleIcon,
  },
  STALE: {
    label: "Stale data",
    variant: "outline",
    icon: ClockIcon,
  },
};

type DataQualityChipProps = {
  quality: DataQuality;
  className?: string;
};

export function DataQualityChip({ quality, className }: DataQualityChipProps) {
  const config = qualityConfig[quality];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn("gap-1", className)}>
      <Icon aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  );
}
