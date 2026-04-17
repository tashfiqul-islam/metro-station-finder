import { Link } from "@tanstack/react-router";

import { RouteMapSvg } from "@/components/common/route-map-svg";
import { StatCard } from "@/components/common/stat-card";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STAT_CARDS = [
  { label: "Stations", value: "17" },
  { label: "Total Length", value: "20.1 km" },
  { label: "MRT Network", value: "Line 6" },
] as const;

export const HeroSection = () => (
  <section aria-label="Hero" className={cn("relative overflow-hidden py-20 lg:py-32")}>
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[58fr_42fr] gap-12 lg:gap-16 items-center">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <ViewportAnimation delay={0}>
            <Badge variant="outline">MRT Line 6 · Dhaka Metro</Badge>
          </ViewportAnimation>

          <ViewportAnimation delay={0.1}>
            <h1 className="font-heading text-5xl lg:text-7xl font-extrabold leading-none tracking-tight">
              Navigate <span className="text-primary">Dhaka&apos;s</span> Metro
            </h1>
          </ViewportAnimation>

          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            Your complete guide to Dhaka&apos;s Mass Rapid Transit. Find stations, calculate fares,
            and plan your journey across 17 stations and 20.1 km of Line 6.
          </p>

          <ViewportAnimation delay={0.3}>
            <div className="flex flex-row gap-4 flex-wrap">
              <Button asChild={<Link to="/station-finder">Explore Stations</Link>} size="lg" />
              <Button
                asChild={<Link to="/trip-planner">Plan Your Journey</Link>}
                size="lg"
                variant="outline"
              />
            </div>
          </ViewportAnimation>
        </div>

        {/* Right column */}
        <ViewportAnimation delay={0.4} className="flex flex-col gap-6 items-center lg:items-start">
          <RouteMapSvg className="w-full max-w-sm" />
          <div className="flex flex-col gap-4 w-full max-w-sm">
            {STAT_CARDS.map(({ value, label }) => (
              <StatCard key={label} value={value} label={label} />
            ))}
          </div>
        </ViewportAnimation>
      </div>
    </div>
  </section>
);
