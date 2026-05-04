import { memo } from "react";

import { Footer } from "@/components/ui/footer";
import { CtaSection } from "./sections/cta-section";
import { FeaturesSection } from "./sections/features-section";
import { HeroSection } from "./sections/hero-section";
import { JourneySection } from "./sections/journey-section";
import { StorySection } from "./sections/story-section";
import { TechStackSection } from "./sections/tech-stack-section";

export const HomePage = memo(
  (): React.ReactElement => (
    <div className="relative min-h-screen snap-y snap-proximity scroll-smooth">
      <HeroSection />
      <StorySection />
      <TechStackSection />
      <FeaturesSection />
      <JourneySection />
      <CtaSection />
      <Footer />
    </div>
  ),
);

HomePage.displayName = "HomePage";
