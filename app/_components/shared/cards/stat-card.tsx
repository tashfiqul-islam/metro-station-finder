"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { memo, useRef } from "react";
import { ANIMATION_CONFIG } from "@/components/home/data/animation-config";
import type { StatData } from "@/components/home/types";
import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";

interface StatCardProps extends StatData {
  readonly index: number;
}

/**
 * Modern stat card component with enhanced animations
 */
export const StatCard = memo(
  ({ icon: Icon, value, label, description, index }: StatCardProps): React.ReactElement => {
    const shouldReduceMotion = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const { startPageTransition } = useViewTransitions();

    const handleClick = () => {
      startPageTransition(() => {
        // Stat card click handler - can be extended for navigation or other actions
      });
    };

    return (
      <motion.div
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-primary/10 bg-linear-to-br from-background/95 to-background/80 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
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
        {/* Background gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Content */}
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15">
            <Icon
              aria-hidden="true"
              className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 font-bold text-2xl text-foreground">{value}</div>
            <div className="mb-0.5 font-medium text-foreground text-sm">{label}</div>
            <div className="text-muted-foreground text-xs">{description}</div>
          </div>
        </div>
      </motion.div>
    );
  }
);

StatCard.displayName = "StatCard";
