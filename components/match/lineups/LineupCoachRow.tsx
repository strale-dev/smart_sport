import { PlayerPhoto } from "@/components/player/PlayerPhoto";

type LineupCoachRowProps = {
  coachName: string | null;
  coachPhotoUrl: string | null;
};

export function LineupCoachRow({
  coachName,
  coachPhotoUrl,
}: LineupCoachRowProps) {
  if (!coachName) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Coach
      </span>
      <PlayerPhoto
        name={coachName}
        photoUrl={coachPhotoUrl}
        className="size-8"
      />
      <span className="text-sm font-medium">{coachName}</span>
    </div>
  );
}
