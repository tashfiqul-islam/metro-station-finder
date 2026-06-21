import {
  ArrowRightIcon,
  CurrencyCircleDollarIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { memo } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/pages/home/components/section-heading";

interface ActionItem {
  title: string;
  description: string;
  eyebrow: string;
  icon: React.ElementType;
  href: "/station-finder" | "/station-fares" | "/trip-planner";
  cta: string;
  accent: string;
}

const ACTIONS: ActionItem[] = [
  {
    accent: "oklch(0.64 0.2 145 / 0.12)",
    cta: "Open station finder",
    description:
      "Search the line by station name and orient yourself before you leave for the platform.",
    eyebrow: "If you need the right stop",
    href: "/station-finder",
    icon: MagnifyingGlassIcon,
    title: "Find a station",
  },
  {
    accent: "oklch(0.74 0.15 75 / 0.12)",
    cta: "Open fare lookup",
    description:
      "Check the exact fare between two MRT-6 stations before you reach the ticket machine.",
    eyebrow: "If you need the price first",
    href: "/station-fares",
    icon: CurrencyCircleDollarIcon,
    title: "Check fares",
  },
  {
    accent: "oklch(0.60 0.18 249 / 0.12)",
    cta: "Open trip planner",
    description:
      "See the route, count the stops, and understand the stretch of the line you are about to use.",
    eyebrow: "If you need the whole trip",
    href: "/trip-planner",
    icon: MapTrifoldIcon,
    title: "Plan the journey",
  },
] as const;

export const CtaSection = memo(
  (): React.ReactElement => (
    <section aria-label="Choose a starting point" className="relative py-24 lg:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 26% at 18% 24%, oklch(0.64 0.2 145 / 0.07), transparent), radial-gradient(34% 22% at 82% 78%, oklch(0.60 0.18 249 / 0.06), transparent)",
        }}
      />

      <div className="container relative mx-auto px-4">
        <ViewportAnimation>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
            <SectionHeading
              description="Start from the task, not the menu. Open the finder, fare table, or trip planner from one clear starting point."
              eyebrow="Start here"
              title="Choose the answer you need next"
            />

            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 lg:justify-self-end">
              <span>Three starting points</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-border-strong" />
              <span>One line model</span>
            </div>
          </div>
        </ViewportAnimation>

        <ViewportAnimation delay={0.08}>
          <div className="mt-14 grid gap-4 lg:grid-cols-3 lg:gap-5">
            {ACTIONS.map(({ accent, cta, description, eyebrow, href, icon: Icon, title }) => (
              <article
                className="section-card group relative flex h-full flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/28 hover:shadow-[0_24px_70px_oklch(0_0_0/0.10)]"
                key={title}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, var(--color-primary), transparent)",
                    opacity: 0.45,
                  }}
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-70"
                  style={{ background: `linear-gradient(180deg, transparent, ${accent})` }}
                />

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/35 bg-muted/65"
                    style={{ boxShadow: `0 8px 24px ${accent}` }}
                  >
                    <Icon aria-hidden className="h-5 w-5 text-primary/80" weight="duotone" />
                  </div>

                  <div className="text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                    {eyebrow}
                  </div>
                </div>

                <div className="relative z-10 mt-8 flex flex-1 flex-col">
                  <h3 className="font-heading text-xl font-bold tracking-tight text-foreground">
                    {title}
                  </h3>
                  <p className="mt-4 flex-1 text-sm leading-7 text-muted-foreground">
                    {description}
                  </p>

                  <div className="mt-8">
                    <Button
                      asChild={<Link to={href}>{cta}</Link>}
                      className="w-full justify-between"
                      size="lg"
                      variant="outline"
                    >
                      <span className="inline-flex w-full items-center justify-between gap-3">
                        {cta}
                        <ArrowRightIcon className="h-4 w-4" weight="bold" />
                      </span>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </ViewportAnimation>
      </div>
    </section>
  ),
);

CtaSection.displayName = "CtaSection";
