import {
  ArrowsDownUpIcon,
  CurrencyCircleDollarIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  SpeakerHighIcon,
  WheelchairIcon,
  WifiHighIcon,
} from "@phosphor-icons/react";

import { BentoCard } from "@/components/common/bento-card";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Visual preview components (decorative, aria-hidden by parent wrapper)
// ---------------------------------------------------------------------------

const StationSearchPreview = () => (
  <div className="mt-5 overflow-hidden rounded-xl border border-border/40 bg-background/30">
    <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2.5">
      <MagnifyingGlassIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
      <span className="text-xs text-muted-foreground/50">Farmgate</span>
      <span className="relative ml-auto flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
    </div>
    <div className="divide-y divide-border/20">
      {[
        { active: true, detail: "Agargaon ↔ Kawran Bazar", name: "Farmgate" },
        { active: false, detail: "Bijoy Sarani ↔ Farmgate", name: "Agargaon" },
        { active: false, detail: "Farmgate ↔ Shahbag", name: "Kawran Bazar" },
      ].map(({ name, detail, active }) => (
        <div
          key={name}
          className={cn("flex items-center gap-3 px-3 py-2.5", active && "bg-primary/8")}
        >
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground",
            )}
          >
            {name[0]}
          </div>
          <div className="min-w-0">
            <div
              className={cn(
                "truncate text-xs font-semibold",
                active ? "text-primary" : "text-foreground",
              )}
            >
              {name}
            </div>
            <div className="truncate text-[10px] text-muted-foreground">{detail}</div>
          </div>
          <span className="ml-auto shrink-0 text-[9px] font-medium text-muted-foreground/50">
            Line 6
          </span>
        </div>
      ))}
    </div>
  </div>
);

const FareCalculatorPreview = () => (
  <div className="mt-5 rounded-xl border border-border/40 bg-background/30 p-4">
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-lg border border-border/40 bg-card/50 p-2.5 text-center">
        <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          From
        </div>
        <div className="mt-0.5 text-xs font-bold text-foreground">Uttara North</div>
      </div>
      <div className="text-xs text-muted-foreground/50">→</div>
      <div className="flex-1 rounded-lg border border-border/40 bg-card/50 p-2.5 text-center">
        <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          To
        </div>
        <div className="mt-0.5 text-xs font-bold text-foreground">Motijheel</div>
      </div>
    </div>
    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/8 py-3 text-center">
      <div className="text-2xl font-black" style={{ color: "oklch(0.78 0.13 75)" }}>
        ৳ 100
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">Single journey fare</div>
    </div>
  </div>
);

const TripPlanningPreview = () => (
  <div className="mt-5 space-y-0">
    {[
      { name: "Mirpur 10", time: "depart" },
      { name: "Agargaon", time: "4 min" },
      { name: "Farmgate", time: "9 min" },
      { name: "Shahbag", time: "14 min" },
    ].map(({ name, time }, i, arr) => (
      <div key={name} className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-0.5">
          <div
            className={cn(
              "h-2.5 w-2.5 shrink-0 rounded-full border-2",
              i === 0 || i === arr.length - 1
                ? "border-primary bg-primary"
                : "border-primary/50 bg-background",
            )}
          />
          {i < arr.length - 1 && (
            <div
              className="w-0.5 flex-1 bg-gradient-to-b from-primary/50 to-primary/20"
              style={{ height: "1.5rem" }}
            />
          )}
        </div>
        <div className="flex w-full items-baseline justify-between pb-3">
          <span
            className={cn(
              "text-xs font-medium",
              i === 0 || i === arr.length - 1 ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {name}
          </span>
          <span className="text-[10px] text-muted-foreground/60">{time}</span>
        </div>
      </div>
    ))}
  </div>
);

const LiveUpdatesPreview = () => (
  <div className="mt-4 space-y-2">
    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-2">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        All services normal
      </span>
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      <div className="rounded-lg bg-muted/40 px-2.5 py-2 text-center">
        <div className="text-xs font-bold text-foreground">5 min</div>
        <div className="text-[9px] text-muted-foreground">Headway</div>
      </div>
      <div className="rounded-lg bg-muted/40 px-2.5 py-2 text-center">
        <div className="text-xs font-bold text-foreground">17</div>
        <div className="text-[9px] text-muted-foreground">Stations</div>
      </div>
    </div>
  </div>
);

const AccessibilityPreview = () => (
  <div className="mt-4 grid grid-cols-3 gap-2">
    {[
      { icon: WheelchairIcon, label: "Lifts" },
      { icon: ArrowsDownUpIcon, label: "Ramps" },
      { icon: SpeakerHighIcon, label: "Audio" },
    ].map(({ icon: Icon, label }) => (
      <div
        key={label}
        className="flex flex-col items-center gap-1.5 rounded-xl border border-border/40 bg-muted/30 py-3"
      >
        <Icon className="h-5 w-5 text-primary/70" weight="duotone" />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export const FeaturesSection = (): React.ReactElement => (
  <section aria-label="Features" className="py-20">
    <div className="container mx-auto px-4">
      {/* Section header */}
      <ViewportAnimation>
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-primary/50" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
              Features
            </span>
            <div className="h-px w-8 bg-primary/50" />
          </div>
          <h2
            className="font-heading text-3xl font-bold lg:text-4xl"
            style={{
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              background:
                "linear-gradient(135deg, oklch(0.52 0.12 145), oklch(0.72 0.18 145) 45%, oklch(0.58 0.22 145))",
              backgroundClip: "text",
            }}
          >
            Everything you need
          </h2>
          <p className="mt-3 text-muted-foreground">
            Five tools built for Dhaka commuters. Fast, accurate, and completely free.
          </p>
        </div>
      </ViewportAnimation>

      {/* Bento grid */}
      <ViewportAnimation delay={0.1}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
          {/* Card 1 — Station Search (col-span-2) */}
          <BentoCard
            size="lg"
            className="md:col-span-2"
            accent="oklch(0.64 0.2 145 / 0.15)"
            icon={<MagnifyingGlassIcon size={28} weight="duotone" />}
            title="Station Search"
            description="Find any of the 17 MRT Line 6 stations instantly. Search by name, get location details, nearby landmarks, and real-time service information."
            visual={<StationSearchPreview />}
          />

          {/* Card 2 — Fare Calculator */}
          <BentoCard
            size="md"
            accent="oklch(0.78 0.13 75 / 0.15)"
            icon={<CurrencyCircleDollarIcon size={28} weight="duotone" />}
            title="Fare Calculator"
            description="Calculate exact fares between any two stations. Get single journey, return trip, and MRT Pass pricing in seconds."
            visual={<FareCalculatorPreview />}
          />

          {/* Card 3 — Trip Planning */}
          <BentoCard
            size="md"
            accent="oklch(0.57 0.19 249 / 0.15)"
            icon={<MapTrifoldIcon size={28} weight="duotone" />}
            title="Trip Planning"
            description="Plan multi-leg journeys with optimal routes, estimated travel times, and interchange guidance across the network."
            visual={<TripPlanningPreview />}
          />

          {/* Card 4 — Live Updates */}
          <BentoCard
            size="sm"
            accent="oklch(0.65 0.18 142 / 0.15)"
            icon={<WifiHighIcon size={24} weight="duotone" />}
            title="Live Updates"
            description="Service status and platform information updated in real time."
            visual={<LiveUpdatesPreview />}
          />

          {/* Card 5 — Accessibility */}
          <BentoCard
            size="sm"
            accent="oklch(0.61 0.23 299 / 0.15)"
            icon={<WheelchairIcon size={24} weight="duotone" />}
            title="Accessibility"
            description="Lift locations, accessible routes, and mobility aid facilities at every station."
            visual={<AccessibilityPreview />}
          />
        </div>
      </ViewportAnimation>
    </div>
  </section>
);

FeaturesSection.displayName = "FeaturesSection";
