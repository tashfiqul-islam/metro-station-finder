"use client";

import { ArrowRight, Calculator, MapPin, Navigation } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { StatsCard } from "@/components/hero/stats-card";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { SparklesCore } from "@/components/ui/sparkles";

// Animation constants following React 19 best practices
const EASE_CUBIC_BEZIER_P1 = 0.22;
const EASE_CUBIC_BEZIER_P2 = 1;
const EASE_CUBIC_BEZIER_P3 = 0.36;
const EASE_CUBIC_BEZIER_P4 = 1;
const EASE_CUBIC_BEZIER = [
  EASE_CUBIC_BEZIER_P1,
  EASE_CUBIC_BEZIER_P2,
  EASE_CUBIC_BEZIER_P3,
  EASE_CUBIC_BEZIER_P4,
] as const;

// Theme-aware particle colors
const PARTICLE_COLORS = {
  dark: "#49d549",
  light: "#061906",
} as const;

// Animation timing constants
const ANIMATION_DURATIONS = {
  badge: 0.8,
  heading: 0.9,
  description: 0.7,
  cta: 0.7,
  stats: 0.9,
} as const;

// Individual stat animation delays
const STAT_DELAY_FIRST = 1.4;
const STAT_DELAY_SECOND = 1.5;
const STAT_DELAY_THIRD = 1.6;

const ANIMATION_DELAYS = {
  badge: 0.3,
  heading: 0.5,
  description: 0.8,
  cta: 1,
  stats: 1.3,
  statsItems: [STAT_DELAY_FIRST, STAT_DELAY_SECOND, STAT_DELAY_THIRD],
} as const;

// Stats data following TypeScript 5.9 strict typing
type StatsDataItem = {
  readonly icon: "station" | "fare" | "time";
  readonly label: string;
  readonly sublabel: string;
  readonly value: string;
  readonly delay: number;
};

const STATS_DATA: readonly StatsDataItem[] = [
  {
    icon: "station",
    label: "Active Stations",
    sublabel: "Across Dhaka",
    value: "16",
    delay: ANIMATION_DELAYS.statsItems[0],
  },
  {
    icon: "fare",
    label: "Fare Range",
    sublabel: "Distance Based",
    value: "৳20-100",
    delay: ANIMATION_DELAYS.statsItems[1],
  },
  {
    icon: "time",
    label: "Full Line",
    sublabel: "End to End",
    value: "~40min",
    delay: ANIMATION_DELAYS.statsItems[2],
  },
] as const;

/**
 * Hero Section Component - Optimized with React 19 best practices
 * Features:
 * - useMemo for expensive computations
 * - useCallback for stable function references
 * - TypeScript 5.9 strict typing
 * - Tailwind CSS v4 design system
 * - Modern layout with proper spacing
 */
export function Hero() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Optimize hydration with useEffect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoize theme calculation to prevent unnecessary re-renders
  const currentTheme = useMemo(
    () => (theme === "system" ? resolvedTheme : theme),
    [theme, resolvedTheme]
  );

  // Memoize particle color based on theme
  const particleColor = useMemo(
    () =>
      currentTheme === "dark" ? PARTICLE_COLORS.dark : PARTICLE_COLORS.light,
    [currentTheme]
  );

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <section className="relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-black">
      <div className="absolute inset-0 h-full w-full">
        <SparklesCore
          background="transparent"
          className="h-full w-full"
          id="tsparticles"
          key={`sparkles-${currentTheme}`}
          maxSize={1}
          minSize={0.4}
          particleColor={particleColor}
          particleDensity={500}
        />
      </div>

      <ShootingStars />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--hero-radial-top),0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(var(--hero-radial-bottom),0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--hero-accent)]/10 to-[var(--hero-accent)]/20 dark:from-transparent dark:via-slate-950/50 dark:to-black/80" />

      {/* Content Container - Modern Tailwind v4 spacing system */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex w-full flex-col items-center gap-6 text-center sm:gap-8 lg:gap-10">
          {/* Badge Section */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative inline-block"
            initial={{ opacity: 0, y: 30 }}
            transition={{
              duration: ANIMATION_DURATIONS.badge,
              delay: ANIMATION_DELAYS.badge,
              ease: EASE_CUBIC_BEZIER,
            }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--hero-accent)]/50 bg-gradient-to-r from-[var(--hero-accent)]/60 via-[var(--hero-accent)]/40 to-[var(--hero-accent)]/60 px-5 py-2.5 font-bold text-[var(--hero-accent-foreground)] text-xs uppercase tracking-wider shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-xl sm:px-6">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Intelligent Metro Navigation</span>
            </div>
          </motion.div>

          {/* Heading Section - Optimized for readability and spacing */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl"
            initial={{ opacity: 0, y: 40 }}
            transition={{
              duration: ANIMATION_DURATIONS.heading,
              delay: ANIMATION_DELAYS.heading,
              ease: EASE_CUBIC_BEZIER,
            }}
          >
            <h1 className="font-black text-[clamp(2.5rem,8vw,5rem)] text-slate-900 leading-[0.95] tracking-tighter sm:text-[clamp(3rem,9vw,6rem)] md:text-[clamp(3.5rem,10vw,7rem)] lg:text-[clamp(4rem,11vw,8rem)] dark:text-white">
              <span className="block drop-shadow-2xl">Discover Your</span>
              <span className="mt-2 block bg-gradient-to-r from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)] to-[var(--hero-gradient-to)] bg-clip-text text-transparent drop-shadow-2xl sm:mt-3">
                Perfect Route
              </span>
            </h1>
          </motion.div>

          {/* Description - Enhanced readability */}
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-2xl font-normal text-[clamp(1rem,2.5vw,1.25rem)] text-slate-600 leading-relaxed dark:text-slate-400"
            initial={{ opacity: 0, y: 20 }}
            transition={{
              duration: ANIMATION_DURATIONS.description,
              delay: ANIMATION_DELAYS.description,
              ease: EASE_CUBIC_BEZIER,
            }}
          >
            Seamlessly navigate Dhaka&apos;s metro network with intelligent
            precision. Experience real-time updates, AI-powered routing, and
            lightning-fast fare calculations.
          </motion.p>

          {/* CTA Buttons - Enhanced with modern interaction patterns */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-lg flex-col items-center gap-3 sm:flex-row sm:gap-4"
            initial={{ opacity: 0, y: 30 }}
            transition={{
              duration: ANIMATION_DURATIONS.cta,
              delay: ANIMATION_DELAYS.cta,
              ease: EASE_CUBIC_BEZIER,
            }}
          >
            <motion.div
              className="w-full sm:w-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link className="block w-full" href="/station-finder">
                <HoverBorderGradient
                  as="button"
                  className="w-full border-0 bg-gradient-to-r from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)] to-[var(--hero-gradient-to)] px-6 py-3.5 font-bold text-sm text-white shadow-2xl shadow-[var(--hero-gradient-from)]/30 transition-all duration-500 hover:from-[var(--hero-gradient-from)]/90 hover:via-[var(--hero-gradient-via)]/90 hover:to-[var(--hero-gradient-to)]/90 hover:shadow-[var(--hero-gradient-via)]/50 sm:px-8 sm:py-4"
                  containerClassName="rounded-full w-full"
                  duration={1}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Navigation aria-hidden="true" className="h-4 w-4" />
                    <span>Find Nearest Station</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </span>
                </HoverBorderGradient>
              </Link>
            </motion.div>

            <motion.div
              className="w-full sm:w-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link className="block w-full" href="/fare-calculator">
                <HoverBorderGradient
                  as="button"
                  className="w-full border border-[var(--hero-accent)]/20 bg-slate-900/40 px-6 py-3.5 font-bold text-sm text-white shadow-xl backdrop-blur-xl transition-all duration-500 hover:bg-slate-900/20 sm:px-8 sm:py-4"
                  containerClassName="rounded-full w-full"
                  duration={1.2}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Calculator aria-hidden="true" className="h-4 w-4" />
                    <span>Calculate Fare Price</span>
                  </span>
                </HoverBorderGradient>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats Section - Data-driven with proper responsive design */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl pt-6 sm:pt-8"
            initial={{ opacity: 0, y: 50 }}
            transition={{
              duration: ANIMATION_DURATIONS.stats,
              delay: ANIMATION_DELAYS.stats,
              ease: EASE_CUBIC_BEZIER,
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              {STATS_DATA.map((stat) => (
                <StatsCard
                  delay={stat.delay}
                  icon={stat.icon}
                  key={stat.label}
                  label={stat.label}
                  sublabel={stat.sublabel}
                  value={stat.value}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute right-0 bottom-0 left-0 h-px">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent light:via-[var(--hero-gradient-from)]/30 via-[var(--hero-gradient-from)]/50 to-transparent blur-sm" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent light:via-[var(--hero-gradient-via)]/60 via-[var(--hero-gradient-via)]/80 to-transparent" />
      </div>
    </section>
  );
}
