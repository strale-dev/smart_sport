import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { landingCopy } from "@/lib/marketing/copy";
import { cn } from "@/lib/utils";

export function WaitlistSection({ className }: { className?: string }) {
  return (
    <section
      id="waitlist"
      className={cn(
        "border-border bg-card/40 scroll-mt-20 rounded-2xl border p-8 sm:p-10",
        className
      )}
      aria-labelledby="waitlist-heading"
    >
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h2
          id="waitlist-heading"
          className="font-heading text-2xl font-semibold tracking-tight"
        >
          {landingCopy.waitlistSection.title}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
          {landingCopy.waitlistSection.description}
        </p>
        <WaitlistForm source="landing_footer" compact />
      </div>
    </section>
  );
}
