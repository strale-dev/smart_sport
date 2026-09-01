import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardSectionProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardSection({
  title,
  description,
  actionHref,
  actionLabel = "See all",
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={cn("w-full space-y-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {actionHref ? (
          <Link
            href={actionHref}
            className="text-primary inline-flex shrink-0 items-center gap-1 text-sm font-medium hover:underline"
          >
            {actionLabel}
            <ArrowRightIcon className="size-3.5" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
