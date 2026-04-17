import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";

import { RouteMapSvg } from "@/components/common/route-map-svg";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Button } from "@/components/ui/button";

const STATS = [
  { label: "Stations", value: "17" },
  { label: "Total Length", value: "20.1 km" },
  { label: "MRT Network", value: "Line 6" },
] as const;

export const HeroSection = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section aria-label="Hero" className="relative flex min-h-svh items-center overflow-hidden">
      {/* ── Background layers ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Top-center aurora bloom */}
        <motion.div
          className="absolute left-1/2 top-0 h-[90vh] w-[110vw] -translate-x-1/2 -translate-y-1/3 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 50% 0%, oklch(0.64 0.2 145 / 0.22) 0%, oklch(0.64 0.2 145 / 0.07) 50%, transparent 75%)",
          }}
          animate={shouldReduceMotion ? {} : { opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        />
        {/* Secondary right bloom */}
        <div
          className="absolute -right-48 top-1/4 h-[520px] w-[520px] rounded-full opacity-40"
          style={{
            background: "radial-gradient(ellipse, oklch(0.52 0.2 145 / 0.14) 0%, transparent 70%)",
          }}
        />
        {/* Fine dot grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle, oklch(0.85 0 0) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ── Ambient route map — faded far right ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.055]"
        style={{ filter: "blur(1.5px)" }}
      >
        <RouteMapSvg className="h-[86vh] w-auto" />
      </div>

      {/* ── Terminus floating badges — desktop only ── */}
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

      {/* ── Content ── */}
      <div className="container mx-auto px-4 py-28 lg:py-36">
        <div className="mx-auto max-w-4xl text-center">
          {/* Live badge */}
          <ViewportAnimation delay={0}>
            <div className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/10 px-5 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                MRT Line 6 · Dhaka Metro
              </span>
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
                    "linear-gradient(135deg, oklch(0.72 0.18 145) 0%, oklch(0.58 0.22 145) 50%, oklch(0.74 0.16 70) 100%)",
                }}
              >
                Precision
              </span>
            </h1>
          </ViewportAnimation>

          {/* Description */}
          <ViewportAnimation delay={0.15}>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Your complete guide to Dhaka&apos;s MRT Line 6 — find stations, calculate fares, and
              plan every journey across 17 stations and 20.1&nbsp;km of rapid transit.
            </p>
          </ViewportAnimation>

          {/* CTAs */}
          <ViewportAnimation delay={0.22}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild={<Link to="/station-finder">Explore Stations</Link>}
                size="lg"
                className="min-w-[180px] font-semibold shadow-xl shadow-primary/25"
              />
              <Button
                asChild={<Link to="/trip-planner">Plan Your Journey</Link>}
                size="lg"
                variant="outline"
                className="min-w-[180px] font-semibold"
              />
            </div>
          </ViewportAnimation>

          {/* Inline stats */}
          <ViewportAnimation delay={0.3}>
            <div className="mx-auto mt-16 flex w-fit items-center divide-x divide-border/40 border-t border-border/30 pt-8">
              {STATS.map(({ label, value }) => (
                <div key={label} className="px-7 text-center first:pl-0 last:pr-0">
                  <div className="text-3xl font-extrabold leading-none text-foreground">
                    {value}
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </ViewportAnimation>
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background to-transparent"
      />
    </section>
  );
};
