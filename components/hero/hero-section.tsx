"use client";

import { ArrowRight, Calculator, MapPin, Navigation } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { lazy, memo, Suspense, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Lazy load Sparkles for better initial page load
const Sparkles = lazy(() =>
  import("@/components/ui/sparkles").then((mod) => ({
    default: mod.Sparkles,
  }))
);

/**
 * Animation constants
 */
const EASE_CUBIC_P1 = 0.22;
const EASE_CUBIC_P2 = 1;
const EASE_CUBIC_P3 = 0.36;
const EASE_CUBIC_P4 = 1;
const STAGGER_DELAY = 0.1;
const SPARKLES_LOAD_DELAY_MS = 1000;

/**
 * Animation configuration for smooth, performant animations
 */
const ANIMATION_CONFIG = {
  spring: {
    type: "spring",
    stiffness: 100,
    damping: 20,
  },
  ease: [EASE_CUBIC_P1, EASE_CUBIC_P2, EASE_CUBIC_P3, EASE_CUBIC_P4] as const,
  durations: {
    fast: 0.4,
    normal: 0.6,
    slow: 0.8,
  },
  delays: {
    badge: 0.1,
    heading: 0.2,
    description: 0.3,
    cta: 0.4,
    stats: 0.5,
  },
  stagger: STAGGER_DELAY,
} as const;

/**
 * Stats data configuration
 */
const STATS_DATA = [
  {
    icon: MapPin,
    value: "16",
    label: "Active Stations",
    description: "Across MRT-6",
  },
  {
    icon: Calculator,
    value: "৳20-100",
    label: "Fare Range",
    description: "Distance Based",
  },
  {
    icon: Navigation,
    value: "~40min",
    label: "Full Line",
    description: "End to End",
  },
] as const;

/**
 * Optimized stat card with GPU acceleration
 */
const StatCard = memo(
  ({
    icon: Icon,
    value,
    label,
    description,
    index,
  }: {
    readonly icon: React.ElementType;
    readonly value: string;
    readonly label: string;
    readonly description: string;
    readonly index: number;
  }): React.ReactElement => {
    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-background/95 to-background/80 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
        initial={{ opacity: 0, y: 20 }}
        style={{
          willChange: shouldReduceMotion ? "auto" : "transform, opacity",
        }}
        transition={{
          duration: ANIMATION_CONFIG.durations.normal,
          delay:
            ANIMATION_CONFIG.delays.stats + index * ANIMATION_CONFIG.stagger,
          ease: ANIMATION_CONFIG.ease,
        }}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Content */}
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15">
            <Icon
              aria-hidden="true"
              className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 font-bold text-2xl text-foreground">
              {value}
            </div>
            <div className="mb-0.5 font-medium text-foreground text-sm">
              {label}
            </div>
            <div className="text-muted-foreground text-xs">{description}</div>
          </div>
        </div>
      </motion.div>
    );
  }
);

StatCard.displayName = "StatCard";

/**
 * Optimized button component with GPU acceleration
 */
const CTAButton = memo(
  ({
    href,
    variant = "primary",
    icon: Icon,
    children,
    delay,
  }: {
    readonly href: string;
    readonly variant?: "primary" | "secondary";
    readonly icon: React.ElementType;
    readonly children: React.ReactNode;
    readonly delay: number;
  }): React.ReactElement => {
    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="w-full sm:w-auto"
        initial={{ opacity: 0, y: 20 }}
        style={{
          willChange: shouldReduceMotion ? "auto" : "transform, opacity",
        }}
        transition={{
          duration: ANIMATION_CONFIG.durations.fast,
          delay,
          ease: ANIMATION_CONFIG.ease,
        }}
      >
        <Link
          className={cn(
            "group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-8 py-4 font-semibold text-sm shadow-lg transition-all duration-300 sm:w-auto",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            variant === "primary"
              ? "bg-primary text-primary-foreground shadow-primary/25 hover:shadow-primary/40 hover:shadow-xl"
              : "border border-border/50 bg-background/50 text-foreground backdrop-blur-sm hover:bg-background/80"
          )}
          href={href}
        >
          {/* Hover effect */}
          <span className="absolute inset-0 translate-x-[-200%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[200%]" />

          {/* Content */}
          <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="relative">{children}</span>
          {variant === "primary" && (
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
            />
          )}
        </Link>
      </motion.div>
    );
  }
);

CTAButton.displayName = "CTAButton";

/**
 * Ambient background gradient orbs
 */
const BackgroundGradients = memo(
  (): React.ReactElement => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
      <div
        className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
        style={{
          animation: "float 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
        style={{
          animation: "float 25s ease-in-out infinite reverse",
        }}
      />

      <style jsx>{`
      @keyframes float {
        0%,
        100% {
          transform: translateY(0) translateX(0);
        }
        50% {
          transform: translateY(-50px) translateX(50px);
        }
      }
    `}</style>
    </div>
  )
);

BackgroundGradients.displayName = "BackgroundGradients";

/**
 * Modern hero section with optimized performance
 * Features GPU-accelerated animations, lazy-loaded sparkles, and reduced motion support
 */
export function Hero(): React.ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const [shouldLoadSparkles, setShouldLoadSparkles] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lazy load sparkles with IntersectionObserver
  useEffect(() => {
    const element = heroRef.current;
    if (!(element && mounted)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          // Delay sparkles after hero is visible
          setTimeout(() => {
            setShouldLoadSparkles(true);
          }, SPARKLES_LOAD_DELAY_MS);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [mounted]);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <section
      className="relative flex h-[calc(100vh-8rem)] min-h-[600px] items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background/95 to-muted/30"
      ref={heroRef}
    >
      {/* Lazily loaded sparkles effect */}
      {shouldLoadSparkles && (
        <Suspense fallback={null}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <Sparkles />
          </div>
        </Suspense>
      )}

      {/* Ambient gradients */}
      <BackgroundGradients />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 text-center sm:gap-10">
          {/* Badge */}
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 font-semibold text-primary text-xs uppercase tracking-wider backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            style={{
              willChange: shouldReduceMotion ? "auto" : "transform, opacity",
            }}
            transition={{
              duration: ANIMATION_CONFIG.durations.fast,
              delay: ANIMATION_CONFIG.delays.badge,
              ease: ANIMATION_CONFIG.ease,
            }}
          >
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Dhaka MRT-6 Navigation</span>
          </motion.div>

          {/* Heading */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
            initial={{ opacity: 0, y: 30 }}
            style={{
              willChange: shouldReduceMotion ? "auto" : "transform, opacity",
            }}
            transition={{
              duration: ANIMATION_CONFIG.durations.slow,
              delay: ANIMATION_CONFIG.delays.heading,
              ease: ANIMATION_CONFIG.ease,
            }}
          >
            <h1 className="mb-6 font-extrabold text-4xl text-foreground tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Navigate Dhaka&apos;s Metro with{" "}
              <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                Precision
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl">
              Find stations, calculate fares, and plan your journey across
              Dhaka&apos;s MRT-6 network—fast, accurate, and completely free.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <div className="flex w-full max-w-md flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <CTAButton
              delay={ANIMATION_CONFIG.delays.cta}
              href="/station-finder"
              icon={Navigation}
              variant="primary"
            >
              Find Station
            </CTAButton>
            <CTAButton
              delay={ANIMATION_CONFIG.delays.cta + ANIMATION_CONFIG.stagger}
              href="/fare-calculator"
              icon={Calculator}
              variant="secondary"
            >
              Calculate Fare
            </CTAButton>
          </div>

          {/* Stats */}
          <div className="w-full max-w-4xl pt-12">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              {STATS_DATA.map((stat, index) => (
                <StatCard key={stat.label} {...stat} index={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
