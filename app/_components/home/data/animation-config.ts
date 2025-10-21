/**
 * Animation constants for consistent, performant animations
 */
export const CUBIC_BEZIER_VALUES = {
  easeInOut: 0.22,
  easeOut: 1,
  easeIn: 0.36,
  easeFinal: 1,
} as const;

export const ANIMATION_CONFIG = {
  spring: {
    type: "spring",
    stiffness: 100,
    damping: 20,
  },
  ease: [
    CUBIC_BEZIER_VALUES.easeInOut,
    CUBIC_BEZIER_VALUES.easeOut,
    CUBIC_BEZIER_VALUES.easeIn,
    CUBIC_BEZIER_VALUES.easeFinal,
  ] as const,
  durations: {
    fast: 0.4,
    normal: 0.6,
    slow: 0.8,
  },
  stagger: 0.1,
} as const;
