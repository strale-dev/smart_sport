"use client";

import { CheckIcon, ChevronDownIcon, MinusIcon } from "lucide-react";

import { ANALYSIS_DATA_LABELS } from "@/lib/ai/data-coverage";
import type { InsightDataCoverage } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type AnalysisDataCoverageProps = {
  coverage: InsightDataCoverage | null;
  dataUsedFallback?: string[];
  className?: string;
};

function resolveCoverage(
  input: AnalysisDataCoverageProps
): InsightDataCoverage {
  if (input.coverage) {
    return input.coverage;
  }

  return {
    dataAvailable: input.dataUsedFallback ?? [],
    dataMissing: [],
  };
}

function partialDataHint(missing: string[]): string | null {
  if (missing.length === 0) {
    return null;
  }

  const onlyPredictedLineups =
    missing.length === 1 &&
    missing[0] === ANALYSIS_DATA_LABELS.confirmedLineups;

  if (onlyPredictedLineups) {
    return "Some inputs are not available yet (predicted lineups only). The model still runs on form, standings, and head-to-head where those are present.";
  }

  return "Some inputs are not available yet. The analysis uses only the data listed under “Used in this analysis” and does not invent missing stats.";
}

export function AnalysisDataCoverage({
  coverage,
  dataUsedFallback,
  className,
}: AnalysisDataCoverageProps) {
  const resolved = resolveCoverage({ coverage, dataUsedFallback });
  const hint = partialDataHint(resolved.dataMissing);
  const hasMissing = resolved.dataMissing.length > 0;

  return (
    <Collapsible
      defaultOpen={hasMissing}
      className={cn(
        "border-border/70 bg-muted/15 rounded-xl border",
        className
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium">
        <span>Data used in this analysis</span>
        <ChevronDownIcon
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0 transition-transform in-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 px-4 pb-4">
        {hint ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {hint}
          </p>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide uppercase">
            Used in this analysis
          </p>
          <ul className="space-y-1.5">
            {resolved.dataAvailable.map((item) => (
              <li
                key={item}
                className="text-foreground/90 flex items-start gap-2 text-sm"
              >
                <CheckIcon
                  aria-hidden="true"
                  className="text-primary mt-0.5 size-4 shrink-0"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {hasMissing ? (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Not available yet
            </p>
            <ul className="space-y-1.5">
              {resolved.dataMissing.map((item) => (
                <li
                  key={item}
                  className="text-muted-foreground flex items-start gap-2 text-sm"
                >
                  <MinusIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 opacity-60"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
