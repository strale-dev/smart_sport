import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { buildLiveCenterHref } from "@/lib/live/url";
import type { LiveStatusFilter } from "@/lib/live/constants";
import { cn } from "@/lib/utils";

type LiveCenterPaginationProps = {
  page: number;
  totalPages: number;
  league?: number;
  status?: LiveStatusFilter;
};

export function LiveCenterPagination({
  page,
  totalPages,
  league,
  status,
}: LiveCenterPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const params = { league, status, page };
  const previousHref = buildLiveCenterHref(params, { page: page - 1 });
  const nextHref = buildLiveCenterHref(params, { page: page + 1 });

  return (
    <nav
      aria-label="Live matches pagination"
      className="flex items-center justify-between gap-3"
    >
      {page > 1 ? (
        <Link
          href={previousHref}
          aria-label="Previous page"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <ChevronLeftIcon className="size-4" />
          Previous
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "pointer-events-none opacity-50"
          )}
        >
          <ChevronLeftIcon className="size-4" />
          Previous
        </span>
      )}

      <p className="text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Link
          href={nextHref}
          aria-label="Next page"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Next
          <ChevronRightIcon className="size-4" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "pointer-events-none opacity-50"
          )}
        >
          Next
          <ChevronRightIcon className="size-4" />
        </span>
      )}
    </nav>
  );
}
