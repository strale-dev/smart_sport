import { AI_DISCLAIMER } from "@/lib/marketing/copy";
import { cn } from "@/lib/utils";

type AiDisclaimerTextProps = {
  className?: string;
};

export function AiDisclaimerText({ className }: AiDisclaimerTextProps) {
  return (
    <p
      className={cn("text-muted-foreground text-xs leading-relaxed", className)}
    >
      {AI_DISCLAIMER}
    </p>
  );
}
