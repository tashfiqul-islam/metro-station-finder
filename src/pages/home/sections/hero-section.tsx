import { Link } from "@tanstack/react-router";

import { RouteMapSvg } from "@/components/common/route-map-svg";
import { StatCard } from "@/components/common/stat-card";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STAT_CARDS = [
  { label: "Stations", value: "17" },
  { label: "Total Length", value: "20.1 km" },
  { label: "MRT Network", value: "Line 6" },
] as const;

export const HeroSection = () => (
  <section aria-label="Hero" className="relative overflow-hidden py-20 lg:py-32">
    {/* Atmospheric depth — radial spotlight behind left column */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        background:
          "radial-gradient(ellipse 70% 60% at 15% 50%, oklch(0.64 0.2 145 / 0.10) 0%, transparent 70%)",
      }}
    />

    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[58fr_42fr] gap-12 lg:gap-16 items-center">
        {/* Left column */}
        <div className="flex flex-col gap-6 text-center lg:text-left">
          <ViewportAnimation delay={0}>
            <div className="flex justify-center lg:justify-start">
              <Badge
                variant="outline"
                className="flex items-center gap-2 border-primary/40 px-3 py-1"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse"
                  aria-hidden="true"
                />
                MRT Line 6 · Dhaka Metro
              </Badge>
            </div>
          </ViewportAnimation>

          <ViewportAnimation delay={0.1}>
            <h1 className="font-heading text-5xl lg:text-7xl font-extrabold leading-none tracking-tight">
              Navigate{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, oklch(0.64 0.2 145) 0%, oklch(0.72 0.15 65) 100%)",
                }}
              >
                Dhaka&apos;s
              </span>
              <br />
              Metro
            </h1>
          </ViewportAnimation>

          <ViewportAnimation delay={0.2}>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
              Your complete guide to Dhaka&apos;s Mass Rapid Transit. Find stations, calculate
              fares, and plan your journey across 17 stations and 20.1 km of Line 6.
            </p>
          </ViewportAnimation>

          <ViewportAnimation delay={0.3}>
            <div className="flex flex-row gap-4 flex-wrap justify-center lg:justify-start">
              <Button
                asChild={<Link to="/station-finder">Explore Stations</Link>}
                size="lg"
                className="shadow-lg shadow-primary/30"
              />
              <Button
                asChild={<Link to="/trip-planner">Plan Your Journey</Link>}
                size="lg"
                variant="outline"
              />
            </div>
          </ViewportAnimation>
        </div>

        {/* Right column — glass card panel */}
        <ViewportAnimation delay={0.4}>
          <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-6 flex flex-col gap-6 items-center">
            <RouteMapSvg className="w-full max-w-xs" />
            {/* Stat cards — horizontal row */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {STAT_CARDS.map(({ value, label }) => (
                <StatCard key={label} value={value} label={label} />
              ))}
            </div>
          </div>
        </ViewportAnimation>
      </div>
    </div>

    {/* Bottom fade — smooth transition into next section */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background"
    />
  </section>
);
