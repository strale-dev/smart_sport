import { BrainIcon, RadioIcon, TargetIcon } from "lucide-react";

const benefits = [
  {
    icon: BrainIcon,
    title: "AI match insights",
    description:
      "Structured pre-match and live analysis with confidence shown.",
  },
  {
    icon: RadioIcon,
    title: "Live Center",
    description: "Follow real matches with relevance-first sorting.",
  },
  {
    icon: TargetIcon,
    title: "Top predictions",
    description:
      "Transparent probabilities — no betting odds, just football data.",
  },
] as const;

export function SignupBenefits() {
  return (
    <ul className="border-border/60 bg-muted/20 space-y-3 rounded-lg border p-4 text-sm">
      {benefits.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.title} className="flex gap-3">
            <Icon
              aria-hidden="true"
              className="text-primary mt-0.5 size-4 shrink-0"
            />
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {item.description}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
