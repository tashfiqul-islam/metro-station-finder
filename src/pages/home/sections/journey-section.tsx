import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { cn } from "@/lib/utils";

interface VersionEntry {
  version: string;
  date: string;
  label: string;
  description: string;
  current: boolean;
  accent: string;
  accentSolid: string;
}

const versions: VersionEntry[] = [
  {
    accent: "oklch(0.57 0.19 249 / 0.18)",
    accentSolid: "oklch(0.60 0.18 249)",
    current: false,
    date: "October 2024",
    description:
      "The first working version — find any MRT Line 6 station by name or location in seconds, with accurate data built for Dhaka commuters from day one.",
    label: "The Beginning",
    version: "v0.1.0",
  },
  {
    accent: "oklch(0.78 0.13 75 / 0.18)",
    accentSolid: "oklch(0.74 0.15 75)",
    current: false,
    date: "November 2024",
    description:
      "Added the fare calculator — look up exact prices for single trips, return journeys, and MRT Pass rides without hunting through outdated PDFs.",
    label: "Enhanced Features",
    version: "v0.2.0",
  },
  {
    accent: "oklch(0.61 0.23 299 / 0.18)",
    accentSolid: "oklch(0.63 0.21 299)",
    current: false,
    date: "January 2026",
    description:
      "A complete rebuild under the hood — faster, more reliable, and the foundation for everything that followed. The app got sharper without changing what commuters relied on.",
    label: "Tech Stack Evolution",
    version: "prerelease",
  },
  {
    accent: "oklch(0.64 0.2 145 / 0.18)",
    accentSolid: "oklch(0.64 0.2 145)",
    current: true,
    date: "April 2026",
    description:
      "Station search, fare lookup, trip planning, and interactive maps — the first complete release built around what Dhaka commuters actually need from MRT Line 6.",
    label: "You are here",
    version: "v1.0.0",
  },
];

export const JourneySection = (): React.ReactElement => {
  const timelineRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    offset: ["start 80%", "end 15%"],
    target: timelineRef,
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const lineOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  return (
    <section aria-label="Project journey" className="py-20">
      <div className="container mx-auto px-4">
        {/* ── Section header ── */}
        <ViewportAnimation>
          <div className="mb-16 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-primary/50" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
                Changelog
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
              The journey
            </h2>
            <p className="mt-3 text-muted-foreground">
              How a commuter's frustration became Dhaka's go-to MRT guide.
            </p>
          </div>
        </ViewportAnimation>

        {/* ── Timeline ──
            Mobile: left track at left-5, all cards on the right (pl-14)
            Desktop: centered track at md:left-1/2, cards alternate left/right
            Container uses max-w-3xl so each half-card has ~352px at 768px */}
        <div className="relative mx-auto max-w-3xl" ref={timelineRef}>
          {/* Track wrapper — left-5 mobile → left-1/2 desktop */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-5 top-0 w-px -translate-x-1/2 overflow-hidden md:left-1/2"
            style={{
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)",
            }}
          >
            {/* Faint static rail always visible */}
            <div
              className="absolute inset-0 w-px"
              style={{ background: "oklch(0.64 0.2 145 / 0.13)" }}
            />
            {/* Scroll-driven color fill */}
            <motion.div
              aria-hidden="true"
              className="absolute top-0 w-px origin-top"
              style={{
                background:
                  "linear-gradient(to bottom, oklch(0.57 0.19 249 / 0.7), oklch(0.61 0.23 299 / 0.6) 50%, oklch(0.64 0.2 145 / 0.85))",
                height: lineHeight,
                opacity: lineOpacity,
              }}
            />
          </div>

          <div className="flex flex-col gap-8 md:gap-12">
            {versions.map((v, i) => {
              const isLeft = i % 2 === 0;

              return (
                <ViewportAnimation key={v.version} delay={i * 0.1}>
                  {/* Mobile: pl-14 with left-track node
                      Desktop: flex row (or reverse), card takes half width, center node */}
                  <div
                    className={cn(
                      "relative flex items-start pl-14",
                      "md:items-center md:pl-0",
                      isLeft ? "md:flex-row" : "md:flex-row-reverse",
                    )}
                  >
                    {/* Mobile-only node — hidden on desktop */}
                    <div
                      className={cn(
                        "absolute left-5 top-5 -translate-x-1/2 z-10 md:hidden",
                        v.current ? "route-stop route-stop--current" : "route-stop",
                      )}
                    />

                    {/* Card — full width mobile, half width desktop */}
                    <div
                      className={cn(
                        "group relative flex-1 overflow-hidden rounded-2xl border shadow-sm transition-all duration-300",
                        "hover:-translate-y-0.5",
                        "md:flex-none md:w-[calc(50%-2rem)]",
                        v.current
                          ? "border-primary/35 bg-card hover:border-primary/55 hover:shadow-[0_8px_32px_oklch(0.64_0.2_145/0.14)]"
                          : "border-border bg-card hover:shadow-md",
                      )}
                    >
                      {/* Accent stripe — always on left on mobile.
                          On desktop flips to face the center line:
                          left-side cards get right stripe, right-side cards keep left stripe */}
                      <div
                        aria-hidden="true"
                        className={cn(
                          "absolute top-0 h-full w-0.5",
                          "left-0",
                          isLeft ? "md:left-auto md:right-0" : "md:left-0",
                        )}
                        style={{
                          background: v.accentSolid,
                          opacity: v.current ? 0.75 : 0.45,
                        }}
                      />

                      {/* Top shimmer — flips direction on left-side desktop cards */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-px"
                        style={{
                          background: isLeft
                            ? `linear-gradient(270deg, ${v.accentSolid}, transparent 55%)`
                            : `linear-gradient(90deg, ${v.accentSolid}, transparent 55%)`,
                          opacity: v.current ? 0.55 : 0.3,
                        }}
                      />

                      {/* Corner bloom — inner corner toward center line */}
                      <div
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute -top-8 h-16 w-28 rounded-full blur-2xl",
                          isLeft ? "right-0" : "left-0",
                        )}
                        style={{ background: v.accent }}
                      />

                      <div className={cn("relative z-10 p-5 sm:p-6", isLeft && "md:text-right")}>
                        {/* Meta row */}
                        <div
                          className={cn(
                            "mb-3 flex flex-wrap items-center gap-2",
                            isLeft && "md:justify-end",
                          )}
                        >
                          <Badge
                            className="font-mono text-xs"
                            style={{
                              backgroundColor: `${v.accentSolid}18`,
                              borderColor: `${v.accentSolid}45`,
                              color: v.accentSolid,
                            }}
                            variant="outline"
                          >
                            {v.version}
                          </Badge>
                          <span className="text-xs text-muted-foreground/70">{v.date}</span>
                          {v.current && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                isLeft ? "md:ml-0" : "ml-auto",
                              )}
                              style={{
                                background: "oklch(0.64 0.2 145 / 0.12)",
                                border: "1px solid oklch(0.64 0.2 145 / 0.25)",
                                color: "oklch(0.64 0.2 145)",
                              }}
                            >
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                              </span>
                              Live
                            </span>
                          )}
                        </div>

                        {/* Label */}
                        <h3
                          className={cn(
                            "font-heading mb-2 text-lg font-bold",
                            v.current ? "text-primary" : "text-foreground",
                          )}
                        >
                          {v.label}
                        </h3>

                        {/* Description */}
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {v.description}
                        </p>
                      </div>
                    </div>

                    {/* Desktop-only center node — w-16 keeps it exactly at 50% of container */}
                    <div className="hidden md:flex md:w-16 md:shrink-0 md:items-center md:justify-center md:z-10">
                      <div
                        className={cn(v.current ? "route-stop route-stop--current" : "route-stop")}
                      />
                    </div>

                    {/* Desktop spacer — fills the opposite half */}
                    <div className="hidden md:block md:w-[calc(50%-2rem)] md:flex-none" />
                  </div>
                </ViewportAnimation>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

JourneySection.displayName = "JourneySection";
