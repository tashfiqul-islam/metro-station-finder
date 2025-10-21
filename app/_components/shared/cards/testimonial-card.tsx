"use client";

import { Star, Users } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { memo, useRef } from "react";
import { ANIMATION_CONFIG } from "@/components/home/data/animation-config";
import type { TestimonialData } from "@/components/home/types";
import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";

interface TestimonialCardProps extends TestimonialData {
  readonly index: number;
}

/**
 * Helper function to render stars
 */
const renderStars = (rating: number, name: string): React.ReactElement[] => {
  const stars: React.ReactElement[] = [];
  for (let i = 1; i <= rating; i++) {
    stars.push(
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" key={`${name}-star-${i}`} />
    );
  }
  return stars;
};

/**
 * Testimonial card component
 */
export const TestimonialCard = memo(
  ({ name, role, content, rating, index }: TestimonialCardProps): React.ReactElement => {
    const shouldReduceMotion = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const { startPageTransition } = useViewTransitions();

    const handleClick = () => {
      startPageTransition(() => {
        // Testimonial card click handler - can be extended for navigation or other actions
      });
    };

    return (
      <motion.div
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        className="relative cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background/50 to-background/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
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
        <div className="mb-4 flex items-center gap-1">{renderStars(rating, name)}</div>
        <blockquote className="mb-4 text-muted-foreground text-sm leading-relaxed">
          "{content}"
        </blockquote>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-foreground text-sm">{name}</div>
            <div className="text-muted-foreground text-xs">{role}</div>
          </div>
        </div>
      </motion.div>
    );
  }
);

TestimonialCard.displayName = "TestimonialCard";
