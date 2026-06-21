import {
  ArrowRightIcon,
  CurrencyCircleDollarIcon,
  MapTrifoldIcon,
  NavigationArrowIcon,
  TrainSimpleIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { RouteMapSvg } from "@/components/common/route-map-svg";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Button } from "@/components/ui/button";

const STATS = [
  { label: "Stations tracked", value: "17" },
  { label: "Route length", value: "20.1 km" },
  { label: "Current line", value: "MRT-6" },
] as const;

const FEATURES = [
  { icon: NavigationArrowIcon, label: "Station finder" },
  { icon: CurrencyCircleDollarIcon, label: "Fare lookup" },
  { icon: MapTrifoldIcon, label: "Trip planning" },
] as const;

const TASK_FLOW = [
  { label: "Locate", value: "nearest station" },
  { label: "Price", value: "station pair fare" },
  { label: "Plan", value: "line segment" },
] as const;

export const HeroSection = (): React.ReactElement => (
  <section aria-label="Hero" className="relative overflow-x-clip py-24 lg:py-32 xl:py-36">
    {/* Ambient background */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 top-10"
      style={{
        background:
          "radial-gradient(40% 24% at 18% 24%, oklch(0.64 0.2 145 / 0.06), transparent), radial-gradient(30% 18% at 82% 28%, oklch(0.58 0.14 70 / 0.04), transparent)",
      }}
    />

    <div className="container relative mx-auto px-4">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(34rem,1fr)] lg:items-center xl:gap-16">
        <div className="max-w-2xl">
          <ViewportAnimation>
            <div className="section-chip inline-flex items-center gap-2 border-primary/20 bg-primary/6 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/75">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_oklch(0.64_0.2_145/0.55)]" />
              MRT Line 6 / Dhaka Metro Rail
            </div>
          </ViewportAnimation>

          <ViewportAnimation delay={0.06}>
            <h1 className="mt-6 max-w-[13ch] font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-[4.25rem] xl:leading-[0.96]">
              Navigate Dhaka's metro with
              <span className="gradient-text block">station-level clarity</span>
            </h1>
          </ViewportAnimation>

          <ViewportAnimation delay={0.12}>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              Find the right station, check the fare before the ticket machine, and read the MRT-6
              corridor in one calm flow instead of switching between PDFs, screenshots, and
              guesswork.
            </p>
          </ViewportAnimation>

          <ViewportAnimation delay={0.18}>
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div
                  className="section-chip inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-muted-foreground"
                  key={label}
                >
                  <Icon aria-hidden className="h-3.5 w-3.5 text-primary/75" weight="duotone" />
                  {label}
                </div>
              ))}
            </div>
          </ViewportAnimation>

          <ViewportAnimation delay={0.24}>
            <div aria-label="Primary commuter workflow" className="mt-7 grid gap-2 sm:grid-cols-3">
              {TASK_FLOW.map(({ label, value }) => (
                <div className="section-card px-3.5 py-3 shadow-sm" key={label}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                    {label}
                  </div>
                  <div className="mt-1 text-sm font-semibold tracking-tight text-foreground">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </ViewportAnimation>

          <ViewportAnimation delay={0.3}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild={
                  <Link to="/station-finder">
                    <span className="inline-flex items-center gap-2">
                      Explore Stations
                      <ArrowRightIcon className="h-4 w-4" weight="bold" />
                    </span>
                  </Link>
                }
                className="min-w-47.5 gap-2 font-semibold shadow-[0_14px_35px_oklch(0.50_0.18_145/0.22)] ring-1 ring-primary/20 transition-all duration-300 hover:shadow-[0_18px_45px_oklch(0.50_0.18_145/0.30)]"
                size="lg"
                variant="primary"
              />

              <Button
                asChild={
                  <Link to="/trip-planner">
                    <span>Plan Your Journey</span>
                  </Link>
                }
                className="min-w-47.5 font-semibold transition-all duration-300 hover:border-primary/45 hover:bg-primary/5"
                size="lg"
                variant="outline"
              />
            </div>
          </ViewportAnimation>

          <ViewportAnimation delay={0.36}>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {STATS.map(({ label, value }) => (
                <div className="section-card px-4 py-4 shadow-sm" key={label}>
                  <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </ViewportAnimation>
        </div>

        {/* Right: Route Map */}
        <ViewportAnimation delay={0.08} className="lg:justify-self-end">
          <div className="section-panel relative overflow-hidden p-5 sm:p-6 lg:w-152 xl:w-2xl">
            <div
              aria-hidden="true"
              className="hero-map-surface pointer-events-none absolute inset-0"
            />

            <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-border/40 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                  <TrainSimpleIcon className="h-3.5 w-3.5" weight="duotone" />
                  Active corridor
                </div>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  Uttara North to Kamalapur
                </h2>
              </div>

              <div className="section-chip px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                MRT-6 route map
              </div>
            </div>

            <div className="route-map-frame relative mt-6 rounded-lg p-3.5 sm:p-5">
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/45 to-transparent" />
              <RouteMapSvg className="mx-auto h-auto w-full text-foreground/95" />
            </div>

            <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
              <div className="section-card px-4 py-3.5 shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                  North terminus
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">Uttara North</div>
              </div>

              <div className="section-card px-4 py-3.5 shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                  South terminus
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">Kamalapur</div>
              </div>
            </div>
          </div>
        </ViewportAnimation>
      </div>
    </div>
  </section>
);

HeroSection.displayName = "HeroSection";
