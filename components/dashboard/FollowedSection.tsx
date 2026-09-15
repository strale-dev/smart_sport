import type { ReactNode } from "react";
import Link from "next/link";

import { FollowToggle } from "@/components/follow/FollowToggle";
import { TeamLogo } from "@/components/match/TeamLogo";
import { PlayerPhoto } from "@/components/player/PlayerPhoto";
import { EmptyState } from "@/components/common/EmptyState";
import type { UserFollowsDashboard } from "@/lib/services/followService";
import { UsersIcon } from "lucide-react";

type FollowedSectionProps = {
  data: UserFollowsDashboard;
  isAuthenticated: boolean;
};

function FollowedSubsection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function FollowedSection({
  data,
  isAuthenticated,
}: FollowedSectionProps) {
  const total = data.teams.length + data.players.length + data.leagues.length;

  if (total === 0) {
    return (
      <EmptyState
        icon={UsersIcon}
        title="No follows yet"
        description="Follow teams, players, or leagues from their profile pages to see them here."
        actions={[{ label: "Browse fixtures", href: "/fixtures" }]}
      />
    );
  }

  return (
    <div className="space-y-6">
      {data.teams.length > 0 ? (
        <FollowedSubsection title="Teams">
          <ul className="space-y-2">
            {data.teams.map((team) => (
              <li
                key={team.followId}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <Link
                  href={`/teams/${team.providerId}`}
                  className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
                >
                  <TeamLogo
                    name={team.name}
                    logoUrl={team.logoUrl}
                    className="size-8 shrink-0"
                  />
                  <span className="truncate text-sm font-medium">
                    {team.name}
                  </span>
                </Link>
                <FollowToggle
                  objectType="TEAM"
                  providerId={team.providerId}
                  initialFollowing
                  isAuthenticated={isAuthenticated}
                  returnTo="/dashboard"
                />
              </li>
            ))}
          </ul>
        </FollowedSubsection>
      ) : null}

      {data.players.length > 0 ? (
        <FollowedSubsection title="Players">
          <ul className="space-y-2">
            {data.players.map((player) => (
              <li
                key={player.followId}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <Link
                  href={`/players/${player.providerId}`}
                  className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
                >
                  <PlayerPhoto
                    name={player.fullName}
                    photoUrl={player.photoUrl}
                    className="size-8 shrink-0"
                  />
                  <span className="truncate text-sm font-medium">
                    {player.fullName}
                  </span>
                </Link>
                <FollowToggle
                  objectType="PLAYER"
                  providerId={player.providerId}
                  initialFollowing
                  isAuthenticated={isAuthenticated}
                  returnTo="/dashboard"
                />
              </li>
            ))}
          </ul>
        </FollowedSubsection>
      ) : null}

      {data.leagues.length > 0 ? (
        <FollowedSubsection title="Leagues">
          <ul className="space-y-2">
            {data.leagues.map((league) => (
              <li
                key={league.followId}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <Link
                  href={`/leagues/${league.providerId}`}
                  className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
                >
                  {league.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={league.logoUrl}
                      alt=""
                      className="size-8 shrink-0 object-contain"
                    />
                  ) : (
                    <span className="bg-muted size-8 shrink-0 rounded-full" />
                  )}
                  <span className="truncate text-sm font-medium">
                    {league.name}
                  </span>
                </Link>
                <FollowToggle
                  objectType="LEAGUE"
                  providerId={league.providerId}
                  initialFollowing
                  isAuthenticated={isAuthenticated}
                  returnTo="/dashboard"
                />
              </li>
            ))}
          </ul>
        </FollowedSubsection>
      ) : null}
    </div>
  );
}
