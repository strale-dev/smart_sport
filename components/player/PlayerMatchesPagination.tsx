import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { buildPlayerHref } from "@/lib/players/url";
import { cn } from "@/lib/utils";

type PlayerMatchesPaginationProps = {
  playerId: number;
  page: number;
  totalPages: number;
};

export function PlayerMatchesPagination({
  playerId,
  page,
  totalPages,
}: PlayerMatchesPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const previousHref = buildPlayerHref(playerId, {
    tab: "matches",
    page: page - 1,
  });
  const nextHref = buildPlayerHref(playerId, {
    tab: "matches",
    page: page + 1,
  });

  return (
    <nav
      aria-label="Player matches pagination"
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
