import { motion, useInView, useReducedMotion } from "motion/react";
import { memo, useRef } from "react";

import { cn } from "@/lib/utils";

const REDUCED_MOTION_DURATION = 0.1;
const NORMAL_MOTION_DURATION = 0.6;

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  snapAlign?: "start" | "center" | "end" | "proximity";
}

/**
 * Section wrapper providing consistent spacing, scroll animations, and layout.
 * Respects prefers-reduced-motion for accessibility.
 */
export const SectionWrapper = memo<SectionWrapperProps>(
  ({ children, className, id, snapAlign = "proximity" }): React.ReactElement => {
    const shouldReduceMotion = useReducedMotion();
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, {
      amount: 0.1,
      margin: "-50px",
      once: true,
    });

    const snapClass = snapAlign === "proximity" ? "snap-proximity" : `snap-${snapAlign}`;

    return (
      <motion.section
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        className={cn(
          `relative flex min-h-screen ${snapClass} snap-start items-center justify-center overflow-hidden`,
          className,
        )}
        data-section-id={id}
        id={id}
        initial={{ opacity: 0 }}
        ref={ref}
        style={{
          minHeight: "100dvh",
          willChange: shouldReduceMotion ? "auto" : "opacity",
          zIndex: 1,
        }}
        transition={{
          duration: shouldReduceMotion ? REDUCED_MOTION_DURATION : NORMAL_MOTION_DURATION,
          ease: "easeOut",
        }}
      >
        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">{children}</div>
      </motion.section>
    );
  },
);

SectionWrapper.displayName = "SectionWrapper";
