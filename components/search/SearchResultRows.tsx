"use client";

import Image from "next/image";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatFixtureKickoffDateTime } from "@/lib/fixtures/display";
import type {
  SearchHit,
  SearchLeagueHit,
  SearchMatchHit,
  SearchPlayerHit,
  SearchTeamHit,
} from "@/lib/search/types";
import { cn } from "@/lib/utils";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";

type RowProps = {
  active?: boolean;
  id?: string;
  onSelect?: () => void;
};

function EntityAvatar({
  src,
  alt,
  fallback,
}: {
  src: string | null;
  alt: string;
  fallback: string;
}) {
  return (
    <Avatar className="size-8 shrink-0 rounded-md">
      {src ? (
        <AvatarImage src={src} alt={alt} className="object-contain p-0.5" />
      ) : null}
      <AvatarFallback className="rounded-md text-[10px]">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}

function ResultButton({
  children,
  active,
  id,
  onSelect,
}: RowProps & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "hover:bg-muted/60 flex w-full min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
        active && "bg-muted/80"
      )}
    >
      {children}
    </button>
  );
}

export function SearchTeamRow({
  hit,
  ...props
}: RowProps & { hit: SearchTeamHit }) {
  const subtitle = [hit.countryName, hit.code].filter(Boolean).join(" · ");
  return (
    <ResultButton {...props}>
      <EntityAvatar
        src={hit.logoUrl}
        alt={hit.name}
        fallback={hit.name.slice(0, 2).toUpperCase()}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{hit.name}</p>
        {subtitle ? (
          <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
        ) : null}
      </div>
    </ResultButton>
  );
}

export function SearchPlayerRow({
  hit,
  ...props
}: RowProps & { hit: SearchPlayerHit }) {
  return (
    <ResultButton {...props}>
      <EntityAvatar
        src={hit.photoUrl}
        alt={hit.fullName}
        fallback={hit.fullName.slice(0, 2).toUpperCase()}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{hit.fullName}</p>
        {hit.teamName ? (
          <p className="text-muted-foreground truncate text-xs">
            {hit.teamName}
          </p>
        ) : null}
      </div>
    </ResultButton>
  );
}

export function SearchLeagueRow({
  hit,
  ...props
}: RowProps & { hit: SearchLeagueHit }) {
  return (
    <ResultButton {...props}>
      <EntityAvatar
        src={hit.logoUrl}
        alt={hit.name}
        fallback={hit.name.slice(0, 2).toUpperCase()}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{hit.name}</p>
        {hit.countryName ? (
          <p className="text-muted-foreground truncate text-xs">
            {hit.countryName}
          </p>
        ) : null}
      </div>
    </ResultButton>
  );
}

export function SearchMatchRow({
  hit,
  ...props
}: RowProps & { hit: SearchMatchHit }) {
  const timeZone = useViewerTimezone();
  const scoreLabel =
    hit.scoreHome != null && hit.scoreAway != null
      ? `${hit.scoreHome} – ${hit.scoreAway}`
      : formatFixtureKickoffDateTime(hit.kickoffAt, timeZone);

  return (
    <ResultButton {...props}>
      <div className="flex shrink-0 items-center -space-x-1">
        {hit.home.logoUrl ? (
          <Image
            src={hit.home.logoUrl}
            alt=""
            width={24}
            height={24}
            className="bg-background ring-background size-6 rounded-full object-contain ring-2"
          />
        ) : (
          <span className="bg-muted size-6 rounded-full" />
        )}
        {hit.away.logoUrl ? (
          <Image
            src={hit.away.logoUrl}
            alt=""
            width={24}
            height={24}
            className="bg-background ring-background size-6 rounded-full object-contain ring-2"
          />
        ) : (
          <span className="bg-muted size-6 rounded-full" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {hit.home.name} vs {hit.away.name}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {hit.league.name} · {scoreLabel}
        </p>
      </div>
    </ResultButton>
  );
}

export function SearchHitRow({ hit, ...props }: RowProps & { hit: SearchHit }) {
  switch (hit.type) {
    case "team":
      return <SearchTeamRow hit={hit} {...props} />;
    case "player":
      return <SearchPlayerRow hit={hit} {...props} />;
    case "league":
      return <SearchLeagueRow hit={hit} {...props} />;
    case "match":
      return <SearchMatchRow hit={hit} {...props} />;
    default:
      return null;
  }
}

export function SearchCategoryLink({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="text-primary hover:text-primary/80 px-2 py-1 text-xs font-medium"
    >
      {label}
    </Link>
  );
}
