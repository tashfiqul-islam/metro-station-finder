import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { memo, useRef } from "react";

import {
  COMPLEX_OPACITY_VALUES,
  DELAY_VALUES,
  DURATION_VALUES,
  MOVEMENT_VALUES,
  PRIMARY_OPACITY_SEQUENCE,
  PRIMARY_SCALE_SEQUENCE,
  PRIMARY_SCROLL_SEQUENCE,
  ROTATION_VALUES,
  SCALE_VALUES,
  SCROLL_POINTS,
  SECONDARY_OPACITY_SEQUENCE,
  SECONDARY_SCALE_SEQUENCE,
  SECONDARY_SCROLL_SEQUENCE,
  TERTIARY_OPACITY_SEQUENCE,
  TERTIARY_SCROLL_SEQUENCE,
  Y_OFFSETS,
} from "@/components/ui/animation-constants";

/**
 * Unified scroll-driven background for the homepage.
 * Renders a single fixed layer of animated gradient blobs.
 * Consolidates the two legacy background files into one export.
 */
export const UnifiedBackground = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    offset: ["start end", "end start"],
    target: containerRef,
  });

  const opacity = useTransform(
    scrollYProgress,
    [...PRIMARY_SCROLL_SEQUENCE],
    [...PRIMARY_OPACITY_SEQUENCE],
  );
  const scale = useTransform(
    scrollYProgress,
    [...PRIMARY_SCROLL_SEQUENCE],
    [...PRIMARY_SCALE_SEQUENCE],
  );
  const rotate = useTransform(
    scrollYProgress,
    [0, 1],
    [ROTATION_VALUES.none, ROTATION_VALUES.full],
  );
  const y = useTransform(scrollYProgress, [0, 1], [0, Y_OFFSETS.largeNegative]);

  const secondaryOpacity = useTransform(
    scrollYProgress,
    [...SECONDARY_SCROLL_SEQUENCE],
    [...SECONDARY_OPACITY_SEQUENCE],
  );
  const secondaryScale = useTransform(
    scrollYProgress,
    [...PRIMARY_SCROLL_SEQUENCE],
    [...SECONDARY_SCALE_SEQUENCE],
  );
  const secondaryRotate = useTransform(
    scrollYProgress,
    [0, 1],
    [ROTATION_VALUES.full, ROTATION_VALUES.none],
  );

  const tertiaryOpacity = useTransform(
    scrollYProgress,
    [...TERTIARY_SCROLL_SEQUENCE],
    [...TERTIARY_OPACITY_SEQUENCE],
  );
  const tertiaryY = useTransform(
    scrollYProgress,
    [0, 1],
    [Y_OFFSETS.smallPositive, Y_OFFSETS.mediumNegative],
  );

  const additionalDepthOpacity = useTransform(
    scrollYProgress,
    [SCROLL_POINTS.start, SCROLL_POINTS.twoThirds, SCROLL_POINTS.end],
    [COMPLEX_OPACITY_VALUES.low, COMPLEX_OPACITY_VALUES.medium, COMPLEX_OPACITY_VALUES.low],
  );

  const accentOpacity = useTransform(
    scrollYProgress,
    [SCROLL_POINTS.start, SCROLL_POINTS.eightyPercent, SCROLL_POINTS.end],
    [
      COMPLEX_OPACITY_VALUES.veryLow,
      COMPLEX_OPACITY_VALUES.mediumLow,
      COMPLEX_OPACITY_VALUES.veryLow,
    ],
  );

  const accentScale = useTransform(
    scrollYProgress,
    [SCROLL_POINTS.start, SCROLL_POINTS.half, SCROLL_POINTS.end],
    [SCALE_VALUES.small, SCALE_VALUES.extraLarge, SCALE_VALUES.small],
  );

  if (shouldReduceMotion) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/8 blur-3xl dark:bg-primary/20 dark:blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-primary/6 blur-3xl dark:bg-primary/15 dark:blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 h-80 w-80 rounded-full bg-purple-500/4 blur-3xl dark:bg-purple-500/10 dark:blur-3xl" />
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 w-full overflow-hidden"
      ref={containerRef}
      style={{
        background:
          "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 50%, rgba(236, 72, 153, 0.05) 100%)",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        height: "100vh",
        minHeight: "100vh",
      }}
    >
      <motion.div
        animate={{
          x: [0, MOVEMENT_VALUES.extraLarge, 0],
          y: [0, MOVEMENT_VALUES.mediumNegative, 0],
        }}
        className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl dark:bg-primary/30 dark:blur-3xl"
        style={{ opacity, rotate, scale, y }}
        transition={{
          duration: DURATION_VALUES.slow,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      <motion.div
        animate={{
          x: [0, MOVEMENT_VALUES.mediumNegative, 0],
          y: [0, MOVEMENT_VALUES.large, 0],
        }}
        className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-primary/8 blur-3xl dark:bg-primary/20 dark:blur-3xl"
        style={{
          opacity: secondaryOpacity,
          rotate: secondaryRotate,
          scale: secondaryScale,
        }}
        transition={{
          delay: DELAY_VALUES.medium,
          duration: DURATION_VALUES.verySlow,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      <motion.div
        animate={{
          x: [0, MOVEMENT_VALUES.large, 0],
          y: [0, MOVEMENT_VALUES.smallNegative, 0],
        }}
        className="absolute bottom-1/4 left-1/3 h-80 w-80 rounded-full bg-purple-500/5 blur-3xl dark:bg-purple-500/15 dark:blur-3xl"
        style={{ opacity: tertiaryOpacity, y: tertiaryY }}
        transition={{
          delay: DELAY_VALUES.extraLarge,
          duration: DURATION_VALUES.extremelySlow,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      <motion.div
        animate={{
          x: [0, MOVEMENT_VALUES.smallNegative, 0],
          y: [0, MOVEMENT_VALUES.medium, 0],
        }}
        className="absolute top-2/3 right-1/3 h-64 w-64 rounded-full bg-rose-500/3 blur-[3rem] dark:bg-rose-500/10 dark:blur-2xl"
        style={{ opacity: additionalDepthOpacity }}
        transition={{
          delay: DELAY_VALUES.small,
          duration: DURATION_VALUES.ultraSlow,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      <motion.div
        animate={{
          x: [0, MOVEMENT_VALUES.medium, 0],
          y: [0, MOVEMENT_VALUES.largeNegative, 0],
        }}
        className="absolute top-1/2 left-1/2 h-72 w-72 rounded-full bg-accent-500/3 blur-3xl dark:bg-accent-500/8 dark:blur-3xl"
        style={{ opacity: accentOpacity, scale: accentScale }}
        transition={{
          delay: DELAY_VALUES.large,
          duration: DURATION_VALUES.maximumSlow,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      <motion.div
        animate={{
          x: [0, MOVEMENT_VALUES.medium, 0],
          y: [0, MOVEMENT_VALUES.smallNegative, 0],
        }}
        className="absolute top-1/2 right-1/4 h-64 w-64 rounded-full bg-primary/5 blur-[3rem] dark:bg-primary/15 dark:blur-2xl"
        style={{ opacity: secondaryOpacity, scale: secondaryScale }}
        transition={{
          duration: DURATION_VALUES.slow,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      <motion.div
        animate={{
          x: [0, MOVEMENT_VALUES.largeNegative, 0],
          y: [0, MOVEMENT_VALUES.medium, 0],
        }}
        className="absolute right-1/3 bottom-0 h-72 w-72 rounded-full bg-blue-500/3 blur-3xl dark:bg-blue-500/8 dark:blur-3xl"
        style={{ opacity: secondaryOpacity, scale: secondaryScale }}
        transition={{
          duration: DURATION_VALUES.slow,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />

      <div className="absolute inset-0 bg-linear-to-b from-transparent via-primary/2 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-purple-500/1 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-br from-blue-500/1 via-transparent to-pink-500/1" />
    </div>
  );
});

UnifiedBackground.displayName = "UnifiedBackground";
