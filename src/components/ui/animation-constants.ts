/**
 * Animation constants for consistent, performant animations
 */
export const CUBIC_BEZIER_VALUES = {
  easeFinal: 1,
  easeIn: 0.36,
  easeInOut: 0.22,
  easeOut: 1,
} as const;

export const ANIMATION_CONFIG = {
  durations: {
    fast: 0.4,
    normal: 0.6,
    slow: 0.8,
  },
  ease: [
    CUBIC_BEZIER_VALUES.easeInOut,
    CUBIC_BEZIER_VALUES.easeOut,
    CUBIC_BEZIER_VALUES.easeIn,
    CUBIC_BEZIER_VALUES.easeFinal,
  ] as const,
  spring: {
    damping: 20,
    stiffness: 100,
    type: "spring",
  },
  stagger: 0.1,
} as const;

// Scroll points for unified background
export const SCROLL_POINTS = {
  eightyPercent: 0.8,
  end: 1,
  half: 0.5,
  quarter: 0.25,
  start: 0,
  threeQuarter: 0.75,
  twoThirds: 0.67,
} as const;

// Opacity values
export const OPACITY_VALUES = {
  light: 0.2,
  medium: 0.4,
  opaque: 0.8,
  solid: 1,
  strong: 0.6,
  subtle: 0.1,
  transparent: 0,
} as const;

// Scale values
export const SCALE_VALUES = {
  extraLarge: 1.2,
  full: 1,
  large: 0.8,
  medium: 0.5,
  overshoot: 1.1,
  small: 0.3,
  tiny: 0.1,
} as const;

// Rotation values
export const ROTATION_VALUES = {
  full: 360,
  half: 180,
  none: 0,
  quarter: 90,
  threeQuarter: 270,
} as const;

// Y offset values
export const Y_OFFSETS = {
  extraLarge: 80,
  large: 60,
  largeNegative: -60,
  medium: 40,
  mediumNegative: -40,
  small: 20,
  smallPositive: 20,
} as const;

// Duration values
export const DURATION_VALUES = {
  extremelySlow: 2,
  fast: 0.2,
  maximumSlow: 2.5,
  normal: 0.4,
  slow: 0.8,
  ultraSlow: 1.8,
  verySlow: 1.2,
} as const;

// Delay values
export const DELAY_VALUES = {
  extraLarge: 0.6,
  large: 0.3,
  long: 0.4,
  medium: 0.2,
  none: 0,
  short: 0.1,
  small: 0.05,
} as const;

// Movement values
export const MOVEMENT_VALUES = {
  extraLarge: 50,
  large: 30,
  largeNegative: -40,
  medium: 20,
  mediumNegative: -30,
  small: 10,
  smallNegative: -20,
} as const;

// Opacity constants
const OPACITY_0 = 0;
const OPACITY_0_1 = 0.1;
const OPACITY_0_15 = 0.15;
const OPACITY_0_2 = 0.2;
const OPACITY_0_3 = 0.3;
const OPACITY_0_35 = 0.35;
const OPACITY_0_4 = 0.4;
const OPACITY_0_5 = 0.5;
const OPACITY_0_55 = 0.55;
const OPACITY_0_6 = 0.6;
const OPACITY_0_65 = 0.65;
const OPACITY_0_7 = 0.7;
const OPACITY_0_75 = 0.75;
const OPACITY_0_8 = 0.8;
const OPACITY_0_85 = 0.85;
const OPACITY_0_9 = 0.9;
const OPACITY_1 = 1;

// Scale constants
const SCALE_0_7 = 0.7;
const SCALE_0_8 = 0.8;
const SCALE_0_85 = 0.85;
const SCALE_0_9 = 0.9;
const SCALE_1 = 1;
const SCALE_1_05 = 1.05;
const SCALE_1_1 = 1.1;
const SCALE_1_2 = 1.2;

// Complex opacity values
export const COMPLEX_OPACITY_VALUES = {
  low: OPACITY_0_4,
  medium: OPACITY_0_6,
  mediumLow: OPACITY_0_5,
  primary: [OPACITY_0, OPACITY_0_1, OPACITY_0_3, OPACITY_0_6, OPACITY_0_8, OPACITY_1],
  secondary: [OPACITY_0, OPACITY_0_2, OPACITY_0_4, OPACITY_0_7, OPACITY_0_9, OPACITY_1],
  tertiary: [OPACITY_0, OPACITY_0_15, OPACITY_0_35, OPACITY_0_65, OPACITY_0_85, OPACITY_1],
  veryLow: OPACITY_0_2,
} as const;

// Scroll sequences
export const PRIMARY_SCROLL_SEQUENCE = [
  OPACITY_0,
  OPACITY_0_2,
  OPACITY_0_4,
  OPACITY_0_6,
  OPACITY_0_8,
  OPACITY_1,
] as const;
export const SECONDARY_SCROLL_SEQUENCE = [
  OPACITY_0,
  OPACITY_0_15,
  OPACITY_0_35,
  OPACITY_0_55,
  OPACITY_0_75,
  OPACITY_1,
] as const;
export const TERTIARY_SCROLL_SEQUENCE = [
  OPACITY_0,
  OPACITY_0_1,
  OPACITY_0_3,
  OPACITY_0_5,
  OPACITY_0_7,
  OPACITY_1,
] as const;

// Opacity sequences
export const PRIMARY_OPACITY_SEQUENCE = [
  OPACITY_0,
  OPACITY_0_1,
  OPACITY_0_3,
  OPACITY_0_6,
  OPACITY_0_8,
  OPACITY_1,
] as const;
export const SECONDARY_OPACITY_SEQUENCE = [
  OPACITY_0,
  OPACITY_0_2,
  OPACITY_0_4,
  OPACITY_0_7,
  OPACITY_0_9,
  OPACITY_1,
] as const;
export const TERTIARY_OPACITY_SEQUENCE = [
  OPACITY_0,
  OPACITY_0_15,
  OPACITY_0_35,
  OPACITY_0_65,
  OPACITY_0_85,
  OPACITY_1,
] as const;

// Scale sequences
export const PRIMARY_SCALE_SEQUENCE = [
  SCALE_0_8,
  SCALE_0_9,
  SCALE_1,
  SCALE_1_05,
  SCALE_1_1,
  SCALE_1,
] as const;
export const SECONDARY_SCALE_SEQUENCE = [
  SCALE_0_7,
  SCALE_0_85,
  SCALE_1,
  SCALE_1_1,
  SCALE_1_2,
  SCALE_1,
] as const;
