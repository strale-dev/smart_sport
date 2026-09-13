import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type EmptyStateAction = {
  label: string;
  href: string;
  variant?: "default" | "outline";
};

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actions?: EmptyStateAction[];
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actions,
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
      {actions && actions.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <Button
              key={`${action.href}-${action.label}`}
              size="sm"
              variant={action.variant ?? "default"}
              nativeButton={false}
              render={<Link href={action.href} />}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
      {!actions?.length && actionLabel && onAction ? (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
