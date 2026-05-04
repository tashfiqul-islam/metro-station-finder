import { CheckCircleIcon, LightbulbIcon, SmileySadIcon, WrenchIcon } from "@phosphor-icons/react";
import type { ReactElement } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { cn } from "@/lib/utils";

interface StoryItem {
  ordinal: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  accentSolid: string;
}

const STORIES: StoryItem[] = [
  {
    accent: "oklch(0.75 0.14 55 / 0.12)",
    accentSolid: "oklch(0.72 0.16 55)",
    description:
      "Navigating Dhaka's new MRT Line 6 meant hunting through scattered PDFs, outdated maps, and unofficial fare tables. Every commute started with avoidable guesswork.",
    icon: SmileySadIcon,
    ordinal: "01",
    title: "Frustration",
  },
  {
    accent: "oklch(0.78 0.13 75 / 0.12)",
    accentSolid: "oklch(0.74 0.15 75)",
    description:
      "The idea was simple: one place for station lookup, fare answers, and route clarity. No switching tabs, no screenshots, no commuter folklore.",
    icon: LightbulbIcon,
    ordinal: "02",
    title: "Inspiration",
  },
  {
    accent: "oklch(0.57 0.19 249 / 0.12)",
    accentSolid: "oklch(0.60 0.18 249)",
    description:
      "metro-station-finder was built around reliable MRT data, clear route decisions, and an interface that stays fast even when the network does not.",
    icon: WrenchIcon,
    ordinal: "03",
    title: "Solution",
  },
  {
    accent: "oklch(0.64 0.2 145 / 0.12)",
    accentSolid: "oklch(0.64 0.2 145)",
    description:
      "Thousands of commuters now check stations, confirm fares, and plan journeys faster. The result is less friction at the exact moment transit decisions matter.",
    icon: CheckCircleIcon,
    ordinal: "04",
    title: "Impact",
  },
];

export const StorySection = (): ReactElement => (
  <section aria-label="Our story" className="relative py-24 lg:py-32">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(42% 28% at 14% 22%, oklch(0.74 0.15 75 / 0.08), transparent), radial-gradient(38% 24% at 82% 70%, oklch(0.64 0.2 145 / 0.08), transparent)",
      }}
    />

    <div className="container relative mx-auto px-4">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
        <ViewportAnimation>
          <div className="max-w-xl">
            <div className="mb-4 flex items-center gap-3">
              <div aria-hidden className="h-px w-8 bg-primary/50" />
              <span className="section-kicker">Origin</span>
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
              How it started
            </h2>

            <p className="mt-5 max-w-lg text-base leading-8 text-muted-foreground sm:text-lg">
              This was not born from a generic startup idea. It came from a commuter problem: people
              needed reliable MRT information exactly when they were already in motion.
            </p>

            <div className="section-panel mt-10 p-6">
              <div className="flex items-start gap-4">
                <div className="section-chip rounded-2xl border-primary/25 bg-primary/8 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                    Core idea
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    one tool, three commuter decisions
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  What station am I looking for? How much will this trip cost? Which stretch of the
                  line am I actually using?
                </p>
                <p>
                  The section below shows the progression from pain point to working transit tool,
                  with each step kept deliberate and operational rather than marketing-heavy.
                </p>
              </div>
            </div>
          </div>
        </ViewportAnimation>

        <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {STORIES.map((story, index) => {
            const Icon = story.icon;
            const largeCard = index === 0 || index === 3;

            return (
              <ViewportAnimation delay={index * 0.08} key={story.ordinal}>
                <article
                  className={cn(
                    "section-card group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/28 hover:shadow-[0_24px_70px_oklch(0_0_0/0.10)]",
                    largeCard && "sm:min-h-80",
                  )}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${story.accentSolid}, transparent)`,
                      opacity: 0.65,
                    }}
                  />

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-3xl"
                    style={{ background: story.accent }}
                  />

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/35 bg-muted/65"
                      style={{ boxShadow: `0 8px 24px ${story.accent}` }}
                    >
                      <Icon
                        aria-hidden
                        className="h-5 w-5"
                        style={{ color: story.accentSolid }}
                        weight="duotone"
                      />
                    </div>

                    <div className="text-right">
                      <div className="font-heading text-4xl font-black tracking-[-0.04em] text-foreground/10">
                        {story.ordinal}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 mt-8 flex flex-1 flex-col">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                      Step {story.ordinal}
                    </div>
                    <h3 className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground">
                      {story.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {story.description}
                    </p>
                  </div>
                </article>
              </ViewportAnimation>
            );
          })}
        </div>
      </div>
    </div>
  </section>
);
