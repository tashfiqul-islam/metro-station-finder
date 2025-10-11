"use client";

import { Clock, Coins, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  icon: "station" | "fare" | "time";
  value: string;
  label: string;
  sublabel: string;
  delay: number;
};

const iconComponents = {
  station: MapPin,
  fare: Coins,
  time: Clock,
};

// Animation constants
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
const HOVER_Y_OFFSET = -6;
const HOVER_SCALE = 1.02;

// Pill Indicator component (inspired by Kibo UI)
const PillIndicator = ({ pulse = true }: { pulse?: boolean }) => (
  <span className="relative flex size-2.5">
    {pulse && (
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--hero-accent)] opacity-75" />
    )}
    <span className="relative inline-flex size-2.5 rounded-full bg-[var(--hero-accent-foreground)]" />
  </span>
);

// Ticker-style change indicator (inspired by Kibo UI Ticker)
const ChangeIndicator = ({ isPositive = true }: { isPositive?: boolean }) => (
  <span
    className={cn(
      "flex items-center gap-0.5 font-semibold text-xs",
      isPositive
        ? "text-[var(--hero-accent-foreground)]"
        : "text-rose-600 dark:text-rose-400"
    )}
  >
    <svg
      aria-labelledby="change-indicator-icon"
      className={isPositive ? "" : "rotate-180"}
      fill="currentColor"
      height="10"
      role="img"
      viewBox="0 0 24 24"
      width="10"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="change-indicator-icon">
        {isPositive ? "Increase indicator" : "Decrease indicator"}
      </title>
      <path d="M24 22h-24l12-20z" />
    </svg>
    <span className="text-[10px]">Active</span>
  </span>
);

export function StatsCard({
  icon,
  value,
  label,
  sublabel,
  delay,
}: StatsCardProps) {
  const Icon = iconComponents[icon];

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="group h-full"
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      transition={{
        duration: 0.7,
        delay,
        ease: EASE_CUBIC_BEZIER,
      }}
      whileHover={{ y: HOVER_Y_OFFSET, scale: HOVER_SCALE }}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--hero-accent)]/50 bg-gradient-to-br from-white via-[var(--hero-accent)]/10 to-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_8px_24px_rgba(var(--hero-radial-top),0.08)] transition-all duration-300 hover:border-[var(--hero-accent)]/80 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_12px_40px_rgba(var(--hero-radial-top),0.15)] dark:border-[var(--hero-accent)]/20 dark:from-slate-900/80 dark:via-slate-800/50 dark:to-slate-900/80 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_8px_24px_rgba(var(--hero-radial-top),0.15)] dark:hover:border-[var(--hero-accent)]/30 dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),0_12px_40px_rgba(var(--hero-radial-top),0.25)]">
        {/* Top pill-style status badge */}
        <div className="flex items-center justify-between border-[var(--hero-accent)]/50 border-b bg-gradient-to-r from-[var(--hero-accent)]/20 via-white/50 to-[var(--hero-accent)]/20 px-4 py-2 dark:border-[var(--hero-accent)]/20 dark:from-slate-800/40 dark:via-slate-800/60 dark:to-slate-800/40">
          <div className="flex items-center gap-2">
            <PillIndicator />
            <span className="font-medium text-[10px] text-[var(--hero-accent-foreground)] uppercase tracking-wider">
              {sublabel}
            </span>
          </div>
          <ChangeIndicator />
        </div>

        {/* Main content */}
        <div className="flex flex-1 items-center gap-4 p-5">
          {/* Icon container with ticker-style design */}
          <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--hero-accent)]/50 bg-gradient-to-br from-[var(--hero-accent)]/60 via-[var(--hero-accent)]/40 to-white/80 shadow-inner transition-all duration-300 group-hover:border-[var(--hero-accent)]/80 group-hover:from-[var(--hero-accent)]/80 group-hover:via-[var(--hero-accent)]/60 group-hover:to-white dark:border-[var(--hero-accent)]/20 dark:from-slate-800/60 dark:via-slate-700/40 dark:to-slate-800/60 dark:group-hover:border-[var(--hero-accent)]/30 dark:group-hover:from-slate-800/80">
            <Icon className="relative z-10 h-7 w-7 text-[var(--hero-accent-foreground)] transition-transform duration-300 group-hover:scale-110" />
            {/* Subtle gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[var(--hero-accent-foreground)]/5 via-transparent to-[var(--hero-accent)]/5" />
          </div>

          {/* Text content */}
          <div className="flex flex-1 flex-col gap-1 text-left">
            <h3 className="bg-gradient-to-br from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)] to-[var(--hero-gradient-to)] bg-clip-text font-black text-4xl text-transparent leading-none tracking-tighter">
              {value}
            </h3>
            <p className="font-bold text-[var(--hero-accent-foreground)] text-sm leading-tight">
              {label}
            </p>
          </div>
        </div>

        {/* Bottom accent line with gradient */}
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--hero-accent-foreground)]/40 to-transparent" />

        {/* Hover glow effect */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 shadow-[inset_0_0_20px_rgba(var(--hero-radial-top),0.1)] transition-opacity duration-300 group-hover:opacity-100" />
      </div>
    </motion.div>
  );
}
