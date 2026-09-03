import { cn } from "@/lib/utils";

type StatComparisonRowProps = {
  label: string;
  homeValue: number | string | null;
  awayValue: number | string | null;
  suffix?: string;
  highlightHigher?: boolean;
};

function formatValue(value: number | string | null, suffix = "") {
  if (value == null || value === "") {
    return "–";
  }

  return `${value}${suffix}`;
}

export function StatComparisonRow({
  label,
  homeValue,
  awayValue,
  suffix = "",
  highlightHigher = false,
}: StatComparisonRowProps) {
  const homeNumeric =
    typeof homeValue === "number" ? homeValue : Number(homeValue);
  const awayNumeric =
    typeof awayValue === "number" ? awayValue : Number(awayValue);
  const homeLeads =
    highlightHigher &&
    Number.isFinite(homeNumeric) &&
    Number.isFinite(awayNumeric) &&
    homeNumeric > awayNumeric;
  const awayLeads =
    highlightHigher &&
    Number.isFinite(homeNumeric) &&
    Number.isFinite(awayNumeric) &&
    awayNumeric > homeNumeric;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-sm">
      <span
        className={cn(
          "font-mono tabular-nums",
          homeLeads && "text-foreground font-semibold"
        )}
      >
        {formatValue(homeValue, suffix)}
      </span>
      <span className="text-muted-foreground text-center text-xs">{label}</span>
      <span
        className={cn(
          "text-right font-mono tabular-nums",
          awayLeads && "text-foreground font-semibold"
        )}
      >
        {formatValue(awayValue, suffix)}
      </span>
    </div>
  );
}
