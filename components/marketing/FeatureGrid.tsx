import { BrainIcon, RadioIcon, TargetIcon } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { landingCopy } from "@/lib/marketing/copy";
import { cn } from "@/lib/utils";

const iconMap = {
  brain: BrainIcon,
  radio: RadioIcon,
  target: TargetIcon,
} as const;

export function FeatureGrid({ className }: { className?: string }) {
  return (
    <section
      id="features"
      className={cn("scroll-mt-20 space-y-8", className)}
      aria-labelledby="features-heading"
    >
      <div className="space-y-2 text-center">
        <h2
          id="features-heading"
          className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Football intelligence, built for clarity
        </h2>
        <p className="text-muted-foreground mx-auto max-w-2xl text-sm sm:text-base">
          Depth when you want it. A clean read when you don&apos;t. Every screen
          respects uncertainty — never fake data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {landingCopy.features.map((feature) => {
          const Icon = iconMap[feature.icon];
          return (
            <Card key={feature.id} className="bg-card/50">
              <CardHeader>
                <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <CardTitle className="font-heading text-lg">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
