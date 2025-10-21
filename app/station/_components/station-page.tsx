"use client";

import {
  ArrowLeft,
  Bus,
  Calculator,
  Car,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Train,
  Wifi,
} from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { memo, useOptimistic, useRef, useTransition } from "react";
import type { Station } from "@/lib/types/station";
import { cn } from "@/lib/utils";

/**
 * Animation constants for consistent, performant animations
 */
const CUBIC_BEZIER_VALUES = {
  easeInOut: 0.22,
  easeOut: 1,
  easeIn: 0.36,
  easeFinal: 1,
} as const;

const ANIMATION_CONFIG = {
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

/**
 * Station facilities data
 */
const STATION_FACILITIES = [
  { icon: Wifi, name: "Free WiFi", available: true },
  { icon: Phone, name: "Emergency Phone", available: true },
  { icon: Car, name: "Parking", available: true },
  { icon: Train, name: "Accessibility", available: true },
  { icon: Bus, name: "Bus Connection", available: true },
] as const;

/**
 * Station info card component
 */
const StationInfoCard = memo(
  ({
    icon: Icon,
    title,
    value,
    description,
    index,
  }: {
    readonly icon: React.ElementType;
    readonly title: string;
    readonly value: string;
    readonly description: string;
    readonly index: number;
  }): React.ReactElement => {
    const shouldReduceMotion = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    return (
      <motion.div
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
        className="group relative overflow-hidden rounded-2xl border border-primary/10 bg-linear-to-br from-background/95 to-background/80 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
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
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15">
            <Icon
              aria-hidden="true"
              className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 font-bold text-2xl text-foreground">{value}</div>
            <div className="mb-0.5 font-medium text-foreground text-sm">{title}</div>
            <div className="text-muted-foreground text-xs">{description}</div>
          </div>
        </div>
      </motion.div>
    );
  }
);

StationInfoCard.displayName = "StationInfoCard";

/**
 * Facility card component
 */
const FacilityCard = memo(
  ({
    icon: Icon,
    name,
    available,
    index,
  }: {
    readonly icon: React.ElementType;
    readonly name: string;
    readonly available: boolean;
    readonly index: number;
  }): React.ReactElement => {
    const shouldReduceMotion = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    return (
      <motion.div
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        className="flex items-center gap-3 rounded-xl border border-border/50 bg-linear-to-br from-background/50 to-background/30 p-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/20"
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
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300",
            available
              ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
              : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-foreground text-sm">{name}</div>
          <div
            className={cn(
              "text-xs",
              available ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {available ? "Available" : "Not Available"}
          </div>
        </div>
      </motion.div>
    );
  }
);

FacilityCard.displayName = "FacilityCard";

/**
 * Action button component with useTransition
 */
const ActionButton = memo(
  ({
    href,
    icon: Icon,
    children,
    variant = "primary",
    delay,
  }: {
    readonly href: string;
    readonly icon: React.ElementType;
    readonly children: React.ReactNode;
    readonly variant?: "primary" | "secondary";
    readonly delay: number;
  }): React.ReactElement => {
    const shouldReduceMotion = useReducedMotion();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isOptimistic, addOptimistic] = useOptimistic(false, (_, newState: boolean) => newState);

    const handleClick = () => {
      addOptimistic(true);
      startTransition(() => {
        router.push(href);
      });
    };

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
        <button
          className={cn(
            "group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 font-semibold text-sm shadow-lg transition-all duration-300 sm:w-auto",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            variant === "primary"
              ? "bg-primary text-primary-foreground shadow-primary/25 hover:shadow-primary/40 hover:shadow-xl disabled:hover:shadow-primary/25"
              : "border border-border/50 bg-background/50 text-foreground backdrop-blur-sm hover:bg-background/80"
          )}
          disabled={isPending || isOptimistic}
          onClick={handleClick}
          type="button"
        >
          {isPending || isOptimistic ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
          )}
          <span className="relative">{children}</span>
        </button>
      </motion.div>
    );
  }
);

ActionButton.displayName = "ActionButton";

/**
 * Station page component with modern React 19.2 patterns
 */
export function StationPage({ station }: { station: Station }): React.ReactElement {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative flex min-h-[400px] items-center justify-center overflow-hidden bg-linear-to-br from-primary/5 via-transparent to-transparent"
        ref={ref}
        style={{
          minHeight: "calc(50svh - var(--header-height))",
        }}
      >
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 text-center sm:gap-8">
            {/* Back Button */}
            <motion.div
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              className="w-full max-w-4xl"
              style={{
                willChange: shouldReduceMotion ? "auto" : "transform, opacity",
              }}
              transition={{
                duration: ANIMATION_CONFIG.durations.fast,
                delay: 0.1,
                ease: ANIMATION_CONFIG.ease,
              }}
            >
              <ActionButton delay={0} href="/station-finder" icon={ArrowLeft} variant="secondary">
                Back to Station Finder
              </ActionButton>
            </motion.div>

            {/* Station Name */}
            <motion.div
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              className="max-w-4xl"
              style={{
                willChange: shouldReduceMotion ? "auto" : "transform, opacity",
              }}
              transition={{
                duration: ANIMATION_CONFIG.durations.slow,
                delay: 0.2,
                ease: ANIMATION_CONFIG.ease,
              }}
            >
              <h1 className="mb-4 font-extrabold text-4xl text-foreground tracking-tight sm:text-5xl md:text-6xl">
                {station.name}
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl">
                {station.metadata?.description ||
                  `Metro station on MRT-6 line serving ${station.name} area.`}
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              className="flex w-full max-w-md flex-col items-center gap-3 sm:flex-row sm:gap-4"
              style={{
                willChange: shouldReduceMotion ? "auto" : "transform, opacity",
              }}
              transition={{
                duration: ANIMATION_CONFIG.durations.fast,
                delay: 0.4,
                ease: ANIMATION_CONFIG.ease,
              }}
            >
              <ActionButton delay={0} href="/fare-calculator" icon={Calculator} variant="primary">
                Calculate Fare
              </ActionButton>
              <ActionButton
                delay={ANIMATION_CONFIG.stagger}
                href="/station-finder"
                icon={Navigation}
                variant="secondary"
              >
                Find Route
              </ActionButton>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Station Information */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl">
              Station Information
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Complete details about {station.name} metro station.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <StationInfoCard
              description="Station Name"
              icon={MapPin}
              index={0}
              title="Location"
              value={station.name}
            />
            <StationInfoCard
              description="Daily Schedule"
              icon={Clock}
              index={1}
              title="Operating Hours"
              value="6:00 AM - 10:00 PM"
            />
            <StationInfoCard
              description="Dhaka Metro"
              icon={Train}
              index={2}
              title="Line"
              value="MRT-6"
            />
          </div>
        </div>
      </section>

      {/* Facilities Section */}
      <section className="bg-linear-to-br from-primary/5 via-transparent to-transparent py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl">
              Station Facilities
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Available amenities and services at {station.name}.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STATION_FACILITIES.map((facility, index) => (
              <FacilityCard key={facility.name} {...facility} index={index} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
