import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "m-auto flex w-full max-w-md flex-col items-center justify-center gap-3 px-4 py-6 text-center sm:py-10",
        className
      )}
    >
      {Icon ? (
        <Icon aria-hidden="true" className="text-muted-foreground size-8" />
      ) : null}
      <div className="space-y-1">
        <h3 className="font-heading text-base font-medium">{title}</h3>
        {description ? (
          <p className="text-muted-foreground max-w-sm text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
