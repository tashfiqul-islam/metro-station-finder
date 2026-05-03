import { motion, useReducedMotion } from "motion/react";
import { memo } from "react";

export const UnifiedBackground = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.51_0.175_145/0.10),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.64_0.20_145/0.22),transparent)]" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Ambient top gradient — pure CSS, zero JS cost */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.51_0.175_145/0.10),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.64_0.20_145/0.22),transparent)]" />

      {/* Primary blob — top-left, slow ambient float */}
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, -40, 0] }}
        className="absolute -top-48 -left-48 h-160 w-160 rounded-full bg-primary/7 blur-[96px] dark:bg-primary/18"
        transition={{ duration: 22, ease: "easeInOut", repeat: Infinity }}
      />

      {/* Secondary blob — bottom-right, slightly faster */}
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, 35, 0] }}
        className="absolute -right-48 -bottom-32 h-135 w-135 rounded-full bg-primary/5 blur-[80px] dark:bg-primary/14"
        transition={{
          delay: 4,
          duration: 28,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </div>
  );
});

UnifiedBackground.displayName = "UnifiedBackground";
