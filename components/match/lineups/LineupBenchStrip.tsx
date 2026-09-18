import Link from "next/link";

import { PlayerPhoto } from "@/components/player/PlayerPhoto";
import { formatRating, ratingToneClass } from "@/lib/lineups/rating-badge";
import { lineupPlayerShortName } from "@/lib/lineups/player-name";
import type { LineupDisplayPlayer } from "@/lib/lineups/types";
import { cn } from "@/lib/utils";

type LineupBenchStripProps = {
  players: LineupDisplayPlayer[];
};

function BenchPlayer({ player }: { player: LineupDisplayPlayer }) {
  const rating = formatRating(player.rating);
  const shortName = lineupPlayerShortName(player.name);
  const content = (
    <div className="border-border/70 flex min-w-0 flex-col items-center gap-1 rounded-lg border px-2 py-2">
      <PlayerPhoto
        name={player.name}
        photoUrl={player.photoUrl}
        className="size-9"
      />
      <span className="w-full truncate text-center text-[11px] font-medium">
        {shortName}
      </span>
      <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
        {player.shirtNumber ?? "–"}
      </span>
      {rating ? (
        <span
          className={cn(
            "rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums",
            ratingToneClass(player.rating)
          )}
        >
          {rating}
        </span>
      ) : null}
    </div>
  );

  if (player.playerExternalId) {
    return (
      <Link
        href={`/players/${player.playerExternalId}`}
        className="focus-visible:ring-ring/50 min-w-0 outline-none focus-visible:ring-[3px]"
      >
        {content}
      </Link>
    );
  }

  return <div className="min-w-0">{content}</div>;
}

export function LineupBenchStrip({ players }: LineupBenchStripProps) {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Substitutes
      </p>
      <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6">
        {players.map((player, index) => (
          <BenchPlayer
            key={`${player.playerExternalId ?? player.name}-${index}`}
            player={player}
          />
        ))}
      </div>
    </div>
  );
}
