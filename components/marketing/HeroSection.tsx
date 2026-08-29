import { HeroProductMock } from "@/components/marketing/HeroProductMock";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { landingCopy } from "@/lib/marketing/copy";

export function HeroSection() {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
      <div className="space-y-6">
        <div className="space-y-4">
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            {landingCopy.hero.headline}
          </h1>
          <p className="text-muted-foreground max-w-xl text-base leading-relaxed sm:text-lg">
            {landingCopy.hero.subheadline}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{landingCopy.hero.waitlistHint}</p>
          <WaitlistForm source="landing_hero" className="max-w-md" />
        </div>
      </div>
      <HeroProductMock />
    </section>
  );
}
