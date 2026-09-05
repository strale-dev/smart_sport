import Link from "next/link";

import { buildLeagueHref } from "@/lib/leagues/url";
import { cn } from "@/lib/utils";

type LeagueLinkProps = {
  leagueExternalId: number;
  leagueName: string;
  leagueLogoUrl?: string | null;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

export function LeagueLink({
  leagueExternalId,
  leagueName,
  leagueLogoUrl,
  className,
  onClick,
}: LeagueLinkProps) {
  return (
    <Link
      href={buildLeagueHref(leagueExternalId)}
      onClick={onClick}
      className={cn(
        "hover:text-foreground focus-visible:ring-ring/50 inline-flex min-w-0 items-center gap-1.5 rounded-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
        className
      )}
    >
      {leagueLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={leagueLogoUrl}
          alt=""
          className="size-4 shrink-0 object-contain"
          loading="lazy"
        />
      ) : null}
      <span className="truncate">{leagueName}</span>
    </Link>
  );
}
