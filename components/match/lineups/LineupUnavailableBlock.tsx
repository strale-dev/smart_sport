import type { FixtureSidelinedPlayer } from "@/types/domain";

type LineupUnavailableBlockProps = {
  title: string;
  players: FixtureSidelinedPlayer[];
};

function UnavailableRow({ player }: { player: FixtureSidelinedPlayer }) {
  return (
    <li className="border-border/70 rounded-lg border px-3 py-2 text-sm">
      <span className="font-medium">{player.name}</span>
      {player.reason ? (
        <span className="text-muted-foreground"> · {player.reason}</span>
      ) : null}
    </li>
  );
}

export function LineupUnavailableBlock({
  title,
  players,
}: LineupUnavailableBlockProps) {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {players.map((player, index) => (
          <UnavailableRow
            key={`${player.playerExternalId ?? player.name}-${index}`}
            player={player}
          />
        ))}
      </ul>
    </div>
  );
}
