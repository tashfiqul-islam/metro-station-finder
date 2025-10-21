"use client";

import { Calculator, Navigation } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { memo, useRef } from "react";
import { ANIMATION_CONFIG } from "@/components/home/data/animation-config";
import { CTAButton } from "@/components/shared/buttons/cta-button";

/**
 * CTA section with useTransition for smooth interactions
 */
export const CTASection = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="bg-gradient-to-r from-primary to-primary/80 py-20 sm:py-24" ref={ref}>
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          style={{
            willChange: shouldReduceMotion ? "auto" : "transform, opacity",
          }}
          transition={{
            duration: ANIMATION_CONFIG.durations.normal,
            ease: ANIMATION_CONFIG.ease,
          }}
        >
          <h2 className="mb-4 font-bold text-3xl text-primary-foreground sm:text-4xl">
            Ready to Navigate Dhaka Metro?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/90">
            Start your journey today with the most comprehensive metro navigation tool.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <CTAButton delay={0} href="/station-finder" icon={Navigation} variant="secondary">
              Find Your Station
            </CTAButton>
            <CTAButton
              delay={ANIMATION_CONFIG.stagger}
              href="/fare-calculator"
              icon={Calculator}
              variant="secondary"
            >
              Calculate Fare
            </CTAButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";
