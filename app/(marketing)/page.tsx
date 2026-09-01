import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { HeroSection } from "@/components/marketing/HeroSection";
import { LandingAnalytics } from "@/components/marketing/LandingAnalytics";
import { WaitlistSection } from "@/components/marketing/WaitlistSection";

export default function LandingPage() {
  return (
    <>
      <LandingAnalytics />
      <div className="mx-auto w-full max-w-6xl min-w-0 space-y-20 px-4 py-12 sm:py-16 lg:py-20">
        <HeroSection />
        <FeatureGrid />
        <WaitlistSection />
      </div>
    </>
  );
}
