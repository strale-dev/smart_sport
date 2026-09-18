import { LineupBenchStrip } from "@/components/match/lineups/LineupBenchStrip";
import { LineupCoachRow } from "@/components/match/lineups/LineupCoachRow";
import { LineupUnavailableBlock } from "@/components/match/lineups/LineupUnavailableBlock";
import type { LineupTeamViewModel } from "@/lib/lineups/types";

type LineupSectionProps = {
  team: LineupTeamViewModel;
  showBench?: boolean;
  showUnavailable?: boolean;
};

export function LineupSection({
  team,
  showBench = true,
  showUnavailable = true,
}: LineupSectionProps) {
  return (
    <section className="border-border/70 space-y-3 border-t pt-4">
      <h3 className="text-sm font-semibold">{team.teamName}</h3>
      <LineupCoachRow
        coachName={team.coachName}
        coachPhotoUrl={team.coachPhotoUrl}
      />
      {showBench ? <LineupBenchStrip players={team.substitutes} /> : null}
      {showUnavailable ? (
        <>
          <LineupUnavailableBlock title="Injured" players={team.injured} />
          <LineupUnavailableBlock title="Suspended" players={team.suspended} />
        </>
      ) : null}
    </section>
  );
}
