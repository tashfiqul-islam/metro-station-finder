import { CheckCircleIcon, LightbulbIcon, SmileySadIcon, WrenchIcon } from "@phosphor-icons/react";
import type { ReactElement } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface StoryItem {
  ordinal: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  accentSolid: string;
  glow: string;
}

const STORIES: StoryItem[] = [
  {
    accent: "oklch(0.75 0.14 55 / 0.14)",
    accentSolid: "oklch(0.72 0.16 55)",
    description:
      "Navigating Dhaka's new MRT Line 6 meant hunting through scattered PDFs, outdated maps, and unofficial fare tables — every commute a small research project.",
    glow: "oklch(0.72 0.16 55 / 0.12)",
    icon: SmileySadIcon,
    ordinal: "01",
    title: "Frustration",
  },
  {
    accent: "oklch(0.78 0.13 75 / 0.14)",
    accentSolid: "oklch(0.74 0.15 75)",
    description:
      "A simple idea: one tool that answers every MRT question instantly. Stations, fares, routes — all in one clean interface built for real commuters.",
    glow: "oklch(0.74 0.15 75 / 0.12)",
    icon: LightbulbIcon,
    ordinal: "02",
    title: "Inspiration",
  },
  {
    accent: "oklch(0.57 0.19 249 / 0.14)",
    accentSolid: "oklch(0.60 0.18 249)",
    description:
      "Built metro-station-finder with real fare data, interactive maps, and trip planning — a purpose-built tool that respects the commuter's time.",
    glow: "oklch(0.60 0.18 249 / 0.12)",
    icon: WrenchIcon,
    ordinal: "03",
    title: "Solution",
  },
  {
    accent: "oklch(0.64 0.2 145 / 0.14)",
    accentSolid: "oklch(0.64 0.2 145)",
    description:
      "Thousands of Dhaka commuters now plan their MRT journeys faster. No more guessing fares or missing stations — just clear, reliable transit information.",
    glow: "oklch(0.64 0.2 145 / 0.12)",
    icon: CheckCircleIcon,
    ordinal: "04",
    title: "Impact",
  },
];

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export const StorySection = (): ReactElement => (
  <section aria-label="Our story" className="py-20">
    <div className="container mx-auto px-4">
      {/* Section header */}
      <ViewportAnimation>
        <div className="mb-16 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-primary/50" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
              Origin
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
            How it started
          </h2>
          <p className="mt-3 text-muted-foreground">
            From a daily commuter's frustration to a tool used by thousands.
          </p>
        </div>
      </ViewportAnimation>

      {/* Step indicators row — desktop */}
      <div className="relative mb-6 hidden lg:block">
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2"
          style={{
            background:
              "linear-gradient(90deg, transparent 6%, oklch(0.75 0.14 55 / 0.3) 16%, oklch(0.78 0.13 75 / 0.3) 38%, oklch(0.57 0.19 249 / 0.3) 62%, oklch(0.64 0.2 145 / 0.3) 84%, transparent 94%)",
            height: "1px",
          }}
        />
        <div className="grid grid-cols-4">
          {STORIES.map((story) => (
            <div key={story.ordinal} className="flex justify-center">
              <div
                className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-black"
                style={{
                  background: `radial-gradient(circle, ${story.accent} 0%, var(--color-background) 70%)`,
                  borderColor: story.accentSolid,
                  boxShadow: `0 0 16px ${story.glow}`,
                  color: story.accentSolid,
                }}
              >
                {story.ordinal}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {STORIES.map((story, index) => {
          const Icon = story.icon;
          return (
            <ViewportAnimation key={story.ordinal} delay={index * 0.08}>
              <div
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-2xl",
                  "border border-border/50 bg-card/40 backdrop-blur-sm",
                  "transition-all duration-300 hover:-translate-y-0.5 hover:border-border/80",
                  "hover:shadow-lg hover:shadow-black/8",
                )}
              >
                {/* Top accent shimmer */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${story.accentSolid}, transparent)`,
                    opacity: 0.6,
                  }}
                />

                {/* Radial bloom */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-16 left-1/2 h-32 w-44 -translate-x-1/2 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-150"
                  style={{ background: story.accent }}
                />

                {/* Card body */}
                <div className="relative z-10 flex flex-1 flex-col p-6">
                  {/* Icon */}
                  <div className="mb-5">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/40 bg-muted/50 transition-all duration-300 group-hover:scale-105"
                      style={{
                        boxShadow: `0 4px 16px ${story.glow}`,
                      }}
                    >
                      <Icon
                        aria-hidden="true"
                        className="h-5 w-5"
                        style={{ color: story.accentSolid }}
                        weight="duotone"
                      />
                    </div>
                  </div>

                  {/* Text content */}
                  <h3 className="font-heading mb-2 text-lg font-bold text-foreground">
                    {story.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {story.description}
                  </p>
                </div>

                {/* Bottom accent bar */}
                <div
                  className="h-0.5 w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${story.accentSolid}, transparent)`,
                  }}
                />
              </div>
            </ViewportAnimation>
          );
        })}
      </div>
    </div>
  </section>
);
