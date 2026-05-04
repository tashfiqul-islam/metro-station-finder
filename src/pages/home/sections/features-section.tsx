import {
  CurrencyCircleDollarIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  SpeakerHighIcon,
  WheelchairIcon,
} from "@phosphor-icons/react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { cn } from "@/lib/utils";

interface FeatureItem {
  title: string;
  description: string;
  outcome: string;
  icon: React.ElementType;
  accent: string;
  accentSolid: string;
  size: "lg" | "md";
}

const FEATURES: FeatureItem[] = [
  {
    accent: "oklch(0.64 0.2 145 / 0.10)",
    accentSolid: "oklch(0.64 0.2 145)",
    description:
      "Look up the MRT-6 stations by name and move straight to the stop you actually need.",
    icon: MagnifyingGlassIcon,
    outcome: "Station lookup",
    size: "lg",
    title: "Find the right station",
  },
  {
    accent: "oklch(0.74 0.15 75 / 0.10)",
    accentSolid: "oklch(0.74 0.15 75)",
    description: "Check the fare between two points before you arrive at the ticket machine.",
    icon: CurrencyCircleDollarIcon,
    outcome: "Fare answer",
    size: "lg",
    title: "Check the price first",
  },
  {
    accent: "oklch(0.60 0.18 249 / 0.10)",
    accentSolid: "oklch(0.60 0.18 249)",
    description:
      "See the route, count the stops, and understand the stretch of line you are taking.",
    icon: MapTrifoldIcon,
    outcome: "Trip clarity",
    size: "lg",
    title: "Plan the journey",
  },
  {
    accent: "oklch(0.67 0.15 155 / 0.10)",
    accentSolid: "oklch(0.67 0.15 155)",
    description: "Check platform and service signals without digging through fragmented updates.",
    icon: SpeakerHighIcon,
    outcome: "Service status",
    size: "md",
    title: "See live operating context",
  },
  {
    accent: "oklch(0.61 0.21 299 / 0.10)",
    accentSolid: "oklch(0.61 0.21 299)",
    description: "Understand lift, ramp, and mobility-support information before arriving on site.",
    icon: WheelchairIcon,
    outcome: "Access details",
    size: "md",
    title: "Check accessibility quickly",
  },
] as const;

const FeatureCard = ({
  accent,
  accentSolid,
  description,
  icon: Icon,
  outcome,
  size,
  title,
}: FeatureItem): React.ReactElement => (
  <article
    className={cn(
      "section-card group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_24px_70px_oklch(0_0_0/0.10)]",
      size === "lg" && "min-h-64",
    )}
    data-feature-size={size}
    data-testid="feature-card"
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-px"
      style={{
        background: `linear-gradient(90deg, transparent, ${accentSolid}, transparent)`,
        opacity: 0.55,
      }}
    />

    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-3xl"
      style={{ background: accent }}
    />

    <div className="relative z-10 flex items-start justify-between gap-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/35 bg-muted/65"
        style={{ boxShadow: `0 8px 24px ${accent}` }}
      >
        <Icon aria-hidden className="h-5 w-5" style={{ color: accentSolid }} weight="duotone" />
      </div>

      <div className="text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
        {outcome}
      </div>
    </div>

    <div className="relative z-10 mt-8 flex flex-1 flex-col">
      <h3 className="font-heading text-xl font-bold tracking-tight text-foreground">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  </article>
);

export const FeaturesSection = (): React.ReactElement => (
  <section aria-label="Features" className="relative py-24 lg:py-32">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(38% 24% at 18% 18%, oklch(0.64 0.2 145 / 0.07), transparent), radial-gradient(34% 22% at 84% 74%, oklch(0.60 0.18 249 / 0.06), transparent)",
      }}
    />

    <div className="container relative mx-auto px-4">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <ViewportAnimation>
          <div className="max-w-xl">
            <div className="mb-4 flex items-center gap-3">
              <div aria-hidden className="h-px w-8 bg-primary/50" />
              <span className="section-kicker">Capabilities</span>
            </div>

            <h2
              className="font-heading text-3xl font-bold tracking-tight lg:text-4xl"
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

            <p className="mt-5 max-w-lg text-base leading-8 text-muted-foreground sm:text-lg">
              The product is built around five commuter tasks. Each one reduces a specific transit
              decision to a direct answer.
            </p>

            <div className="section-panel mt-10 p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                Product focus
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Not a dashboard. Not a transport encyclopedia. Just the key pieces of information a
                rider needs before, during, and between stations.
              </p>
            </div>
          </div>
        </ViewportAnimation>

        <ViewportAnimation delay={0.08}>
          <div className="grid gap-4 lg:gap-5">
            <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
              {FEATURES.slice(0, 2).map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>

            <FeatureCard {...(FEATURES[2] as FeatureItem)} />

            <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
              {FEATURES.slice(3).map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </ViewportAnimation>
      </div>
    </div>
  </section>
);

FeaturesSection.displayName = "FeaturesSection";
