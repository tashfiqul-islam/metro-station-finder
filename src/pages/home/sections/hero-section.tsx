import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { CurrencyCircleDollar, MapTrifold, NavigationArrow } from "@phosphor-icons/react";

import { RouteMapSvg } from "@/components/common/route-map-svg";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Button } from "@/components/ui/button";

const STATS = [
  { label: "Stations", value: "17" },
  { label: "Route Length", value: "20.1 km" },
  { label: "MRT Network", value: "Line 6" },
] as const;

const FEATURES = [
  { icon: NavigationArrow, label: "Station Finder" },
  { icon: CurrencyCircleDollar, label: "Fare Calculator" },
  { icon: MapTrifold, label: "Trip Planner" },
] as const;

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
        {/* Secondary bottom-left bloom */}
        <motion.div
          className="absolute -bottom-40 -left-48 h-[500px] w-[500px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, oklch(0.58 0.18 145 / 0.13) 0%, transparent 65%)",
          }}
          animate={shouldReduceMotion ? {} : { opacity: [0.45, 0.85, 0.45] }}
          transition={{ delay: 4, duration: 10, ease: "easeInOut", repeat: Infinity }}
        />
        {/* Tertiary right bloom */}
        <div
          className="absolute -right-48 top-1/4 h-[480px] w-[480px] rounded-full opacity-35"
          style={{
            background: "radial-gradient(ellipse, oklch(0.52 0.20 145 / 0.12) 0%, transparent 68%)",
          }}
        />
        {/* Line grid */}
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
      <div className="container mx-auto px-4 py-28 lg:py-36">
        <div className="mx-auto max-w-4xl text-center">
          {/* Live badge */}
          <ViewportAnimation delay={0}>
            <motion.div
              className="mb-10 inline-block rounded-full p-px"
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }
              }
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.64 0.2 145 / 0.55), oklch(0.74 0.16 70 / 0.35), oklch(0.64 0.2 145 / 0.55))",
                backgroundSize: "200% 200%",
              }}
              transition={{ duration: 4, ease: "linear", repeat: Infinity }}
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
            </motion.div>
          </ViewportAnimation>

          {/* Headline */}
          <ViewportAnimation delay={0.07}>
            <h1 className="font-sans text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-5xl lg:text-6xl">
              Navigate Dhaka&apos;s Metro
              <br className="hidden sm:block" />
              <span className="sm:ml-2">Stations with </span>
              <span
                className="inline-block"
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
            <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground/90 sm:text-xl">
              Stations, fares, and routes — everything you need for MRT Line 6 in one place.
            </p>
          </ViewportAnimation>

          {/* Feature pills */}
          <ViewportAnimation delay={0.2}>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/30 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm"
                >
                  <Icon aria-hidden className="h-3.5 w-3.5 text-primary/70" weight="duotone" />
                  {label}
                </div>
              ))}
            </div>
          </ViewportAnimation>

          {/* CTAs */}
          <ViewportAnimation delay={0.27}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild={<Link to="/station-finder">Explore Stations</Link>}
                size="lg"
                className="min-w-[180px] font-semibold shadow-2xl shadow-primary/30 ring-1 ring-primary/20 transition-all duration-300 hover:shadow-primary/50 hover:ring-primary/40"
              />
              <Button
                asChild={<Link to="/trip-planner">Plan Your Journey</Link>}
                size="lg"
                variant="outline"
                className="min-w-[180px] font-semibold transition-all duration-300 hover:border-primary/50 hover:bg-primary/5"
              />
            </div>
            <p className="mt-5 text-xs text-muted-foreground/45">
              Free to use · No account required · 17 stations covered
            </p>
          </ViewportAnimation>

          {/* Stats — glassmorphism strip */}
          <ViewportAnimation delay={0.34}>
            <div className="mx-auto mt-14 inline-block rounded-2xl border border-border/25 bg-card/20 px-2 py-5 backdrop-blur-md">
              <div className="flex items-center divide-x divide-border/40">
                {STATS.map(({ label, value }) => (
                  <div key={label} className="px-8 text-center">
                    <div className="text-3xl font-extrabold leading-none text-foreground">
                      {value}
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </ViewportAnimation>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        aria-hidden
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        animate={shouldReduceMotion ? {} : { opacity: [0.3, 0.7, 0.3], y: [0, 5, 0] }}
        transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-8 w-px bg-gradient-to-b from-transparent to-primary/50" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
        </div>
      </motion.div>

      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background to-transparent"
      />
    </section>
  );
};

HeroSection.displayName = "HeroSection";
