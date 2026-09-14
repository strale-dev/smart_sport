import Image from "next/image";
import Link from "next/link";

import { LEAGUE_LINK_LOGO_SIZES } from "@/lib/images/logo-dimensions";
import { buildLeagueHref } from "@/lib/leagues/url";
import { cn } from "@/lib/utils";

type LeagueLinkProps = {
  leagueExternalId: number;
  leagueName: string;
  leagueLogoUrl?: string | null;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  logoPriority?: boolean;
};

export function LeagueLink({
  leagueExternalId,
  leagueName,
  leagueLogoUrl,
  className,
  onClick,
  logoPriority = false,
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
        <Image
          src={leagueLogoUrl}
          alt=""
          width={16}
          height={16}
          className="size-4 shrink-0 object-contain"
          priority={logoPriority}
          loading={logoPriority ? undefined : "lazy"}
          sizes={LEAGUE_LINK_LOGO_SIZES}
        />
      ) : null}
      <span className="truncate">{leagueName}</span>
    </Link>
  );
}
