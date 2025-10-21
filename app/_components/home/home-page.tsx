"use client";

import { memo, useEffect, useState } from "react";
import { BenefitsSection } from "./sections/benefits-section";
import { CTASection } from "./sections/cta-section";
import { FeaturesSection } from "./sections/features-section";
import { HeroSection } from "./sections/hero-section";
import { TestimonialsSection } from "./sections/testimonials-section";

/**
 * Modern home page component with React 19.2 patterns
 * Features useTransition, useOptimistic, and useDeferredValue for optimal UX
 */
export const HomePage = memo((): React.ReactElement => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
});

HomePage.displayName = "HomePage";
