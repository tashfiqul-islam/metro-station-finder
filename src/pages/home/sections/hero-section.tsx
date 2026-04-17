import { Link } from "@tanstack/react-router";

import { RouteMapSvg } from "@/components/common/route-map-svg";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Button } from "@/components/ui/button";

const STATS = [
  { label: "Stations", value: "17" },
  { label: "Total Length", value: "20.1 km" },
  { label: "MRT Network", value: "Line 6" },
] as const;

export const HeroSection = () => (
  <section aria-label="Hero" className="relative flex min-h-svh items-center overflow-hidden">
    {/* ── Background depth layers ── */}
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* Ghost line-number watermark */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 select-none font-black leading-none text-primary"
        style={{ fontSize: "45vw", opacity: 0.028 }}
      >
        6
      </div>
      {/* Ambient bloom – left */}
      <div
        className="absolute -left-40 top-1/3 h-[600px] w-[600px] rounded-full blur-[120px]"
        style={{ background: "oklch(0.64 0.2 145 / 0.12)" }}
      />
      {/* Ambient bloom – right behind map */}
      <div
        className="absolute -right-20 bottom-1/4 h-[480px] w-[480px] rounded-full blur-[100px]"
        style={{ background: "oklch(0.64 0.2 145 / 0.08)" }}
      />
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>

    <div className="container mx-auto px-4 py-24 lg:py-32">
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1fr_auto] lg:gap-20">
        {/* ── Left: Editorial copy ── */}
        <div className="flex flex-col text-center lg:text-left">
          {/* Eyebrow */}
          <ViewportAnimation delay={0}>
            <div className="mb-8 flex items-center justify-center gap-2.5 lg:justify-start">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
              <span className="text-xs font-semibold tracking-[0.22em] uppercase text-primary">
                MRT Line 6 · Dhaka Metro
              </span>
            </div>
          </ViewportAnimation>

          {/* Headline — three stacked lines with intentional weight contrast */}
          <ViewportAnimation delay={0.08}>
            <h1 className="font-heading tracking-tight">
              <span className="block text-xl font-light tracking-wide text-muted-foreground lg:text-2xl">
                Navigate
              </span>
              <span className="block text-7xl font-black leading-[0.88] text-foreground lg:text-8xl xl:text-9xl">
                Dhaka&apos;s
              </span>
              <span
                className="block text-7xl font-black leading-[0.88] lg:text-8xl xl:text-9xl"
                style={{
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  backgroundImage:
                    "linear-gradient(135deg, oklch(0.72 0.18 145) 0%, oklch(0.56 0.22 145) 55%, oklch(0.70 0.16 65) 100%)",
                }}
              >
                Metro
              </span>
            </h1>
          </ViewportAnimation>

          {/* Description */}
          <ViewportAnimation delay={0.15}>
            <p className="mx-auto mt-8 max-w-md text-base leading-relaxed text-muted-foreground lg:mx-0 lg:text-lg">
              Your complete guide to Dhaka&apos;s Mass Rapid Transit. Find stations, calculate
              fares, and plan your journey across MRT Line 6.
            </p>
          </ViewportAnimation>

          {/* Inline stats with dividers */}
          <ViewportAnimation delay={0.22}>
            <div className="mx-auto mt-10 w-fit border-t border-border/40 pt-8 lg:mx-0">
              <div className="flex items-center divide-x divide-border/50">
                {STATS.map(({ value, label }) => (
                  <div key={label} className="px-5 text-left first:pl-0 last:pr-0">
                    <div className="text-2xl font-bold leading-none text-foreground">{value}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </ViewportAnimation>

          {/* CTAs */}
          <ViewportAnimation delay={0.28}>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button
                asChild={<Link to="/station-finder">Explore Stations</Link>}
                size="lg"
                className="font-semibold shadow-lg shadow-primary/25"
              />
              <Button
                asChild={<Link to="/trip-planner">Plan Your Journey</Link>}
                size="lg"
                variant="outline"
                className="font-semibold"
              />
            </div>
          </ViewportAnimation>
        </div>

        {/* ── Right: Route map — floating, no card wrapper ── */}
        <ViewportAnimation delay={0.35}>
          <div className="relative mx-auto w-72 lg:w-80 xl:w-[340px]">
            {/* Halo glow behind map */}
            <div
              aria-hidden
              className="absolute inset-x-6 inset-y-8 -z-10 rounded-full blur-3xl"
              style={{ background: "oklch(0.64 0.2 145 / 0.20)" }}
            />

            {/* Floating terminus badge — north */}
            <div className="absolute -left-8 top-4 z-10 rounded-xl border border-border/50 bg-card/90 px-3 py-2 shadow-xl backdrop-blur-md">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                North Terminus
              </div>
              <div className="mt-0.5 text-xs font-semibold text-foreground">Uttara North</div>
            </div>

            {/* Floating terminus badge — south */}
            <div className="absolute -right-8 bottom-16 z-10 rounded-xl border border-border/50 bg-card/90 px-3 py-2 shadow-xl backdrop-blur-md">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                South Terminus
              </div>
              <div className="mt-0.5 text-xs font-semibold text-foreground">Kamalapur</div>
            </div>

            <RouteMapSvg className="w-full drop-shadow-2xl" />
          </div>
        </ViewportAnimation>
      </div>
    </div>

    {/* Bottom fade into next section */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent"
    />
  </section>
);
