"use client";

/**
 * @deprecated Use `LiveStatusChip` with `appearance="compact"` or `appearance="default"`.
 */
import { LiveStatusChip } from "@/components/match/LiveStatusChip";
import { cn } from "@/lib/utils";

type LiveDotProps = {
  className?: string;
  label?: string;
};

export function LiveDot({ className, label = "Live" }: LiveDotProps) {
  if (label === "Live") {
    return <LiveStatusChip appearance="default" className={className} />;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <LiveStatusChip appearance="compact" />
      <span className="text-live text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
    </span>
  );
}
