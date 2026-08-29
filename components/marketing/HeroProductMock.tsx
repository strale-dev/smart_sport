import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { LiveDot } from "@/components/common/LiveDot";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function HeroProductMock({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Card className="border-border/80 bg-card/60 ring-foreground/5 shadow-lg ring-1 backdrop-blur-sm">
        <CardHeader className="gap-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Preview</Badge>
            <Badge variant="secondary">Demo data</Badge>
            <LiveDot />
          </div>
          <CardTitle className="font-heading text-lg">
            Northfield FC vs Riverside United
          </CardTitle>
          <CardDescription>Premier Demo League · 67&apos;</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Northfield</p>
              <p className="font-mono text-3xl font-semibold tabular-nums">2</p>
            </div>
            <span className="text-muted-foreground font-mono text-sm">—</span>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Riverside</p>
              <p className="font-mono text-3xl font-semibold tabular-nums">1</p>
            </div>
          </div>

          <div className="border-border space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">AI live insight</p>
              <DataQualityChip quality="COMPLETE" />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Riverside&apos;s high press created three chances in the last 10
              minutes. Home win probability estimate:{" "}
              <span className="text-foreground font-mono tabular-nums">
                58%
              </span>{" "}
              — analytical estimate, not a betting tip.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Win prob. 58%</Badge>
            <Badge variant="success">Confidence: High</Badge>
          </div>
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        Illustrative product preview with fictional teams and demo statistics —
        not live match data.
      </p>
    </div>
  );
}
