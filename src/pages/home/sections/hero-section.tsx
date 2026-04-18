import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { CurrencyCircleDollar, MagnifyingGlass, NavigationArrow } from "@phosphor-icons/react";

import { RouteMapSvg } from "@/components/common/route-map-svg";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section aria-label="Hero" className="relative flex min-h-svh items-center overflow-x-clip">
      {/* ── Background: multi-layer aurora + grid ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Primary top-center bloom */}
        <motion.div
          className="absolute left-1/2 top-0 h-[95vh] w-[120vw] -translate-x-1/2 -translate-y-[30%] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 50% 0%, oklch(0.64 0.2 145 / 0.22) 0%, oklch(0.64 0.2 145 / 0.07) 52%, transparent 74%)",
          }}
          animate={shouldReduceMotion ? {} : { opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        />
        {/* Secondary bottom-left bloom — offset timing */}
        <motion.div
          className="absolute -bottom-40 -left-48 h-125 w-125 rounded-full"
          style={{
            background: "radial-gradient(ellipse, oklch(0.58 0.18 145 / 0.13) 0%, transparent 65%)",
          }}
          animate={shouldReduceMotion ? {} : { opacity: [0.45, 0.85, 0.45] }}
          transition={{
            delay: 4,
            duration: 10,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
        {/* Tertiary right bloom */}
        <div
          className="absolute -right-48 top-1/4 h-120 w-120 rounded-full opacity-35"
          style={{
            background: "radial-gradient(ellipse, oklch(0.52 0.20 145 / 0.12) 0%, transparent 68%)",
          }}
        />
        {/* Line grid — more architectural than dots */}
        <div
          className="absolute inset-0 opacity-[0.028]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.85 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0 0) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* ── Ambient route map — whisper right ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.05]"
        style={{ filter: "blur(1.5px)" }}
      >
        <RouteMapSvg className="h-[86vh] w-auto" />
      </div>

      {/* ── Terminus floating badges ── */}
      <div className="absolute right-10 top-[16%] z-10 hidden rounded-2xl border border-border/40 bg-card/85 px-4 py-3 shadow-2xl backdrop-blur-xl lg:block xl:right-16">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          North Terminus
        </div>
        <div className="mt-0.5 text-sm font-bold text-foreground">Uttara North</div>
      </div>
      <div className="absolute bottom-[20%] right-10 z-10 hidden rounded-2xl border border-border/40 bg-card/85 px-4 py-3 shadow-2xl backdrop-blur-xl lg:block xl:right-16">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          South Terminus
        </div>
        <div className="mt-0.5 text-sm font-bold text-foreground">Kamalapur</div>
      </div>

      {/* ── Main content ── */}
      <div className="container mx-auto px-4 py-28 lg:py-32">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* ── Left col: text content ── */}
          <div className="text-center lg:text-left">
            {/* Gradient-border shimmer badge */}
            <ViewportAnimation delay={0}>
              <div
                className="mb-10 inline-block rounded-full p-px"
                style={{
                  background:
                    "linear-gradient(90deg, oklch(0.64 0.2 145 / 0.55), oklch(0.74 0.16 70 / 0.35), oklch(0.64 0.2 145 / 0.55))",
                }}
              >
                <div className="inline-flex items-center gap-2.5 rounded-full bg-background/90 px-5 py-2 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    MRT Line 6 · Dhaka Metro
                  </span>
                </div>
              </div>
            </ViewportAnimation>

            {/* Headline */}
            <ViewportAnimation delay={0.07}>
              <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
                Navigate Dhaka&apos;s Metro Stations with{" "}
                <span
                  style={{
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    backgroundImage:
                      "linear-gradient(135deg, oklch(0.76 0.18 145) 0%, oklch(0.56 0.22 145) 45%, oklch(0.78 0.16 70) 100%)",
                  }}
                >
                  Precision
                </span>
              </h1>
            </ViewportAnimation>

            {/* Description */}
            <ViewportAnimation delay={0.15}>
              <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground/90 sm:text-xl lg:mx-0">
                Your complete guide to Dhaka&apos;s MRT Line 6 — find stations, calculate fares, and
                plan every journey across 17 stations and 20.1&nbsp;km of rapid transit.
              </p>
            </ViewportAnimation>

            {/* CTAs */}
            <ViewportAnimation delay={0.22}>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Button
                  asChild={<Link to="/station-finder">Explore Stations</Link>}
                  size="lg"
                  className="min-w-45 font-semibold shadow-2xl shadow-primary/30 ring-1 ring-primary/20 transition-all duration-300 hover:shadow-primary/50 hover:ring-primary/40"
                />
                <Button
                  asChild={<Link to="/trip-planner">Plan Your Journey</Link>}
                  size="lg"
                  variant="outline"
                  className="min-w-45 font-semibold transition-all duration-300 hover:border-primary/50 hover:bg-primary/5"
                />
              </div>
              {/* Trust line */}
              <p className="mt-5 text-xs text-muted-foreground/45 lg:text-left">
                Free to use · No account required · 17 stations covered
              </p>
            </ViewportAnimation>
          </div>

          {/* ── Right col: app preview mockup ── */}
          <div className="relative hidden lg:block">
            {/* Outer glow */}
            <div
              className="absolute -inset-4 rounded-3xl opacity-30"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, oklch(0.64 0.2 145 / 0.25), transparent 70%)",
              }}
            />

            {/* Gradient border wrapper */}
            <div
              className="relative rounded-2xl p-px"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.64 0.2 145 / 0.5), oklch(0.74 0.16 70 / 0.2) 50%, oklch(0.64 0.2 145 / 0.45))",
              }}
            >
              <div className="overflow-hidden rounded-[calc(1rem-1px)] bg-card shadow-2xl">
                {/* Window chrome */}
                <div className="flex items-center gap-2 border-b border-border/40 bg-card/80 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="ml-3 flex-1 text-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      Metro Station Finder
                    </span>
                  </div>
                </div>

                {/* App body */}
                <div className="space-y-3 p-5">
                  {/* Search bar */}
                  <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3">
                    <MagnifyingGlass className="h-4 w-4 shrink-0 text-primary/60" weight="bold" />
                    <span className="text-sm text-muted-foreground/60">
                      Search stations, fares, routes…
                    </span>
                  </div>

                  {/* Feature cards row */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Station Finder card */}
                    <div className="rounded-xl border border-border/40 bg-background/40 p-4 transition-colors hover:border-primary/30">
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                        <NavigationArrow className="h-4 w-4 text-primary" weight="duotone" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">Station Finder</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Find nearby stations
                      </div>
                    </div>
                    {/* Fare Calculator card */}
                    <div className="rounded-xl border border-border/40 bg-background/40 p-4 transition-colors hover:border-primary/30">
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                        <CurrencyCircleDollar className="h-4 w-4 text-primary" weight="duotone" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">Fare Calculator</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Plan your trip cost
                      </div>
                    </div>
                  </div>

                  {/* Mini route strip */}
                  <div className="rounded-xl border border-border/30 bg-background/30 px-4 py-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      MRT Line 6 · Active Stations
                    </div>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {["Uttara N", "Agargaon", "Farmgate", "Shahbag", "Kamalapur"].map(
                        (s, i, arr) => (
                          <div key={s} className="flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-muted-foreground/70">
                              {s}
                            </span>
                            {i < arr.length - 1 && (
                              <div className="h-px w-4 shrink-0 bg-primary/30" />
                            )}
                          </div>
                        ),
                      )}
                      <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground/40">
                        +12 more
                      </span>
                    </div>
                  </div>

                  {/* Stats strip */}
                  <div className="grid grid-cols-3 divide-x divide-border/30 rounded-xl border border-border/30 bg-background/30 py-3">
                    <div className="px-3 text-center">
                      <div className="text-lg font-extrabold text-foreground">17</div>
                      <div className="text-[10px] text-muted-foreground">Stations</div>
                    </div>
                    <div className="px-3 text-center">
                      <div className="text-lg font-extrabold text-foreground">20.1 km</div>
                      <div className="text-[10px] text-muted-foreground">Total Length</div>
                    </div>
                    <div className="px-3 text-center">
                      <div className="text-lg font-extrabold text-foreground">Line 6</div>
                      <div className="text-[10px] text-muted-foreground">MRT Network</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animated scroll indicator */}
      <motion.div
        aria-hidden
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        animate={shouldReduceMotion ? {} : { opacity: [0.3, 0.7, 0.3], y: [0, 5, 0] }}
        transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-8 w-px bg-linear-to-b from-transparent to-primary/50" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
        </div>
      </motion.div>

      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-linear-to-t from-background to-transparent"
      />
    </section>
  );
};

HeroSection.displayName = "HeroSection";
