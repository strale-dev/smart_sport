"use client";

import { formatWinProbability } from "@/lib/ai/format";
import { resolveInsightDisplayMetrics } from "@/lib/ai/insight-display-metrics";
import type {
  PrematchAnalysisSections,
  StoredAIInsight,
} from "@/lib/ai/schemas";
import type { InsightDisplayPrediction } from "@/lib/ai/insight-display-metrics";

type PrematchAnalysisSectionsViewProps = {
  analysis: PrematchAnalysisSections;
  insight: StoredAIInsight;
  prediction: InsightDisplayPrediction | null;
};

function SectionBlock({
  title,
  body,
}: {
  title: string;
  body: string | null | undefined;
}) {
  if (!body?.trim()) {
    return null;
  }

  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <p className="text-sm leading-relaxed">{body}</p>
    </section>
  );
}

export function PrematchAnalysisSectionsView({
  analysis,
  insight,
  prediction,
}: PrematchAnalysisSectionsViewProps) {
  const metrics = resolveInsightDisplayMetrics(insight, prediction);

  return (
    <div className="space-y-6">
      <SectionBlock
        title="Why this prediction?"
        body={analysis.predictionRationale}
      />
      <SectionBlock title="Match summary" body={analysis.matchSummary} />
      <SectionBlock title="Home team" body={analysis.homeTeamAnalysis} />
      <SectionBlock title="Away team" body={analysis.awayTeamAnalysis} />
      <SectionBlock
        title="Head-to-head"
        body={
          analysis.headToHeadAnalysis ??
          "No recent head-to-head meetings were included in this context."
        }
      />
      {analysis.lineupsAndAbsences ? (
        <SectionBlock
          title="Lineups & absences"
          body={analysis.lineupsAndAbsences}
        />
      ) : null}
      <section>
        <h3 className="mb-2 text-sm font-medium">Goals outlook</h3>
        <p className="text-sm leading-relaxed">{analysis.goalsOutlook}</p>
        {prediction && "bttsProb" in prediction ? (
          <ul className="text-muted-foreground mt-2 list-inside list-disc text-xs">
            <li>
              Model BTTS probability:{" "}
              {formatWinProbability(prediction.bttsProb)}
            </li>
            {metrics.over2Prob != null ? (
              <li>
                Over 2.5 (model): {formatWinProbability(metrics.over2Prob)}
              </li>
            ) : null}
            {metrics.over3Prob != null ? (
              <li>
                Over 3.5 (model): {formatWinProbability(metrics.over3Prob)}
              </li>
            ) : null}
          </ul>
        ) : null}
      </section>
      {analysis.risks.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-medium">Key risks</h3>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            {analysis.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {analysis.watchFor.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-medium">
            What could change this call
          </h3>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            {analysis.watchFor.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
