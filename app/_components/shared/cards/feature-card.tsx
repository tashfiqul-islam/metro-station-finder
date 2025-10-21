"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { memo, useOptimistic, useRef, useTransition } from "react";
import { ANIMATION_CONFIG } from "@/components/home/data/animation-config";
import type { FeatureData } from "@/components/home/types";

interface FeatureCardProps extends FeatureData {
  readonly index: number;
}

/**
 * Feature card component with useTransition for smooth navigation
 */
export const FeatureCard = memo(
  ({ icon: Icon, title, description, href, index }: FeatureCardProps): React.ReactElement => {
    const shouldReduceMotion = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const router = useRouter();
    const [isPending] = useTransition();
    const [isOptimistic, addOptimistic] = useOptimistic(false, (_, newState: boolean) => newState);

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      addOptimistic(true);

      // Use simple navigation without competing transitions
      router.push(href);
    };

    return (
      <motion.div
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        className="group relative overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br from-background/50 to-background/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
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
        <button
          className="block w-full text-left"
          disabled={isPending || isOptimistic}
          onClick={handleClick}
          suppressHydrationWarning
          type="button"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15">
              {isPending || isOptimistic ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Icon
                  aria-hidden="true"
                  className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-2 font-semibold text-foreground text-lg transition-colors duration-300 group-hover:text-primary">
                {title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
              <div className="mt-3 flex items-center font-medium text-primary text-sm">
                Learn more
                <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </button>
      </motion.div>
    );
  }
);

FeatureCard.displayName = "FeatureCard";
