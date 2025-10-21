"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { memo, useRef } from "react";
import { ANIMATION_CONFIG } from "@/components/home/data/animation-config";
import type { BenefitData } from "@/components/home/types";
import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";

interface BenefitCardProps extends BenefitData {
  readonly index: number;
}

/**
 * Benefit card component
 */
export const BenefitCard = memo(
  ({ icon: Icon, title, description, index }: BenefitCardProps): React.ReactElement => {
    const shouldReduceMotion = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const { startPageTransition } = useViewTransitions();

    const handleClick = () => {
      startPageTransition(() => {
        // Card click handler - can be extended for navigation or other actions
      });
    };

    return (
      <motion.div
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        className="cursor-pointer text-center"
        onClick={handleClick}
        ref={ref}
        style={{
          willChange: shouldReduceMotion ? "auto" : "transform, opacity",
        }}
        transition={{
          duration: ANIMATION_CONFIG.durations.normal,
          delay: index * ANIMATION_CONFIG.stagger,
          ease: ANIMATION_CONFIG.ease,
        }}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-all duration-300 hover:scale-110 hover:bg-primary/15">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mb-2 font-semibold text-foreground text-lg">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </motion.div>
    );
  }
);

BenefitCard.displayName = "BenefitCard";
