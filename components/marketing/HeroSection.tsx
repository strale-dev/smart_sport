import { LandingHeroExperiment } from "@/components/marketing/LandingHeroExperiment";
import { LandingProductShowcase } from "@/components/marketing/LandingProductShowcase";

export function HeroSection() {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
      <LandingHeroExperiment />
      <LandingProductShowcase />
    </section>
  );
}
