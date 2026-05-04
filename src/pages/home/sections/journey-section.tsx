import { useCallback, useEffect, useRef, useState } from "react";

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
    accent: "oklch(0.57 0.19 249 / 0.14)",
    accentSolid: "oklch(0.60 0.18 249)",
    current: false,
    date: "October 2024",
    description:
      "The first working version established station search around real MRT-6 geography and practical commuter use, not generic map chrome.",
    label: "Initial release",
    version: "v0.1.0",
  },
  {
    accent: "oklch(0.78 0.13 75 / 0.14)",
    accentSolid: "oklch(0.74 0.15 75)",
    current: false,
    date: "November 2024",
    description:
      "Fare lookup followed next, turning the most common station-pair questions into one direct answer instead of trial at the ticket machine.",
    label: "Fare support added",
    version: "v0.2.0",
  },
  {
    accent: "oklch(0.61 0.23 299 / 0.14)",
    accentSolid: "oklch(0.63 0.21 299)",
    current: false,
    date: "January 2026",
    description:
      "The rebuild simplified the stack, tightened the data model, and prepared the product for static prerendering, stronger tests, and edge deployment.",
    label: "Architecture reset",
    version: "prerelease",
  },
  {
    accent: "oklch(0.64 0.2 145 / 0.14)",
    accentSolid: "oklch(0.64 0.2 145)",
    current: true,
    date: "April 2026",
    description:
      "The current milestone combines station lookup, fare clarity, trip planning, and a tighter interface around the actual decisions riders make.",
    label: "Current baseline",
    version: "v1.0.0",
  },
] as const;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const getScrollProgress = (element: HTMLElement): number => {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  const start = viewportHeight * 0.8;
  const end = viewportHeight * 0.15;
  const distance = rect.height + start - end;

  if (distance <= 0) {
    return 1;
  }

  const progress = (start - rect.top) / distance;
  return clamp(progress, 0, 1);
};

export const getDotPositions = (
  containerRect: DOMRect,
  dots: (HTMLDivElement | null)[],
): number[] =>
  dots.map((dot) => {
    if (!dot) {
      return 0;
    }

    const dotRect = dot.getBoundingClientRect();
    return dotRect.top - containerRect.top + dotRect.height / 2;
  });

interface TimelineMeasurement {
  height: number;
  positions: number[];
  progress: number;
}

export const measureTimelineState = (
  element: HTMLDivElement,
  dots: (HTMLDivElement | null)[],
): TimelineMeasurement => {
  const containerRect = element.getBoundingClientRect();

  return {
    height: containerRect.height,
    positions: getDotPositions(containerRect, dots),
    progress: getScrollProgress(element),
  };
};

export const measureTimelineStateOrNull = (
  element: HTMLDivElement | null,
  dots: (HTMLDivElement | null)[],
): TimelineMeasurement | null => (element ? measureTimelineState(element, dots) : null);

interface TimelineDotProps {
  accentSolid: string;
  current: boolean;
  fillOpacity: number;
  fillScale: number;
  registerDot: (el: HTMLDivElement | null) => void;
}

export const TimelineDot = ({
  accentSolid,
  current,
  fillOpacity,
  fillScale,
  registerDot,
}: TimelineDotProps): React.ReactElement => (
  <div
    className="relative z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background"
    ref={registerDot}
  >
    <div
      className="h-3.5 w-3.5 rounded-full border-2"
      style={{
        backgroundColor: current ? `${accentSolid.replace(")", " / 0.12)")}` : "transparent",
        borderColor: current ? accentSolid : "oklch(var(--border))",
      }}
    />

    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ opacity: fillOpacity, scale: fillScale }}
    >
      <div
        className="timeline-circle-glow h-3.5 w-3.5 rounded-full"
        style={{ backgroundColor: accentSolid }}
      />
    </div>

    {current && (
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 rounded-full",
          fillOpacity > 0.05 && "journey-stop-current",
        )}
        style={{ borderColor: accentSolid, opacity: fillOpacity }}
      />
    )}
  </div>
);

export const JourneySection = (): React.ReactElement => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const frameRef = useRef<number | null>(null);

  const [lineHeight, setLineHeight] = useState(0);
  const [lineOpacity, setLineOpacity] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const [dotPositions, setDotPositions] = useState<number[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);

  const measureTimeline = useCallback(() => {
    const measurement = measureTimelineState(
      timelineRef.current as HTMLDivElement,
      dotRefs.current,
    );
    const { height, positions, progress } = measurement;

    setContainerHeight(height);
    setLineProgress(progress);
    setLineHeight(progress * height);
    setLineOpacity(progress > 0 ? Math.min(1, progress / 0.05) : 0);
    setDotPositions(positions);
  }, []);

  useEffect(() => {
    const scheduleMeasure = () => {
      cancelAnimationFrame(frameRef.current ?? 0);

      frameRef.current = requestAnimationFrame(() => {
        measureTimeline();
      });
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    const element = timelineRef.current as HTMLDivElement;
    resizeObserver.observe(element);

    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      cancelAnimationFrame(Number(frameRef.current));
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [measureTimeline]);

  return (
    <section aria-label="Project journey" className="relative py-24 lg:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(34% 22% at 18% 18%, oklch(0.60 0.18 249 / 0.08), transparent), radial-gradient(34% 22% at 82% 78%, oklch(0.64 0.2 145 / 0.08), transparent)",
        }}
      />

      <div className="relative container mx-auto px-4">
        <ViewportAnimation>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
            <div className="max-w-xl">
              <div className="mb-4 flex items-center gap-3">
                <div aria-hidden className="h-px w-8 bg-primary/50" />
                <span className="section-kicker">Product timeline</span>
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
                The journey
              </h2>

              <p className="mt-5 max-w-lg text-base leading-8 text-muted-foreground sm:text-lg">
                The product improved in a few clear steps: solve the station problem, solve the fare
                problem, then tighten the experience around real transit decisions.
              </p>

              <div className="section-panel mt-10 p-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                  What changed
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Each release removed friction. Less hunting, less guesswork, and fewer unnecessary
                  steps between a rider and the answer they need.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 lg:justify-self-end">
              <span>Four milestones</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-border-strong" />
              <span>One commuter problem</span>
            </div>
          </div>
        </ViewportAnimation>

        <ViewportAnimation delay={0.08}>
          <div className="section-panel mt-14 rounded-[2rem] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div className="text-sm font-semibold tracking-tight text-foreground">
                metro-station-finder / timeline
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                How the product matured
              </div>
            </div>

            <div className="relative mt-6" data-timeline-ref ref={timelineRef}>
              <div
                aria-hidden="true"
                className="absolute left-4.75 top-0 z-0 w-0.5 overflow-hidden md:left-1/2 md:-translate-x-1/2"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
                  height: `${containerHeight}px`,
                  maskImage:
                    "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 z-0 w-0.5 bg-linear-to-b from-transparent via-primary/10 to-transparent dark:via-primary/5"
                  style={{ height: `${containerHeight}px` }}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 z-10 w-0.5 rounded-full will-change-[height,opacity]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to top, var(--color-primary) 0%, var(--color-primary) 10%, transparent 100%)",
                    height: `${lineHeight}px`,
                    maxHeight: "100%",
                    opacity: lineOpacity,
                  }}
                />
              </div>

              <div className="flex flex-col gap-6 md:gap-8">
                {versions.map((v, i) => {
                  const isLeft = i % 2 === 0;
                  const dotPosition = dotPositions[i] ?? 0;
                  const fillStart = Math.max(0, dotPosition - 12);
                  const fillEnd = dotPosition + 12;
                  const scrollPx = lineProgress * containerHeight;
                  const fillOpacity =
                    dotPosition === 0
                      ? 0
                      : clamp((scrollPx - fillStart) / Math.max(1, fillEnd - fillStart), 0, 1);
                  const fillScale = 0.6 + fillOpacity * 0.4;

                  return (
                    <div
                      className={cn(
                        "relative flex items-start pl-10 md:items-center md:pl-0",
                        isLeft ? "md:flex-row" : "md:flex-row-reverse",
                      )}
                      key={v.version}
                    >
                      <div className="absolute left-5 top-5 z-10 -translate-x-1/2 md:hidden">
                        <TimelineDot
                          accentSolid={v.accentSolid}
                          current={v.current}
                          fillOpacity={fillOpacity}
                          fillScale={fillScale}
                          registerDot={(el) => {
                            dotRefs.current[i] = el;
                          }}
                        />
                      </div>

                      <article
                        className={cn(
                          "section-card group relative flex-1 overflow-hidden rounded-[1.5rem] p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_50px_oklch(0_0_0/0.08)] md:w-[calc(50%-2rem)] md:flex-none",
                          v.current && "border-primary/30",
                        )}
                      >
                        <div
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute inset-x-0 top-0 h-px",
                            isLeft ? "origin-right" : "origin-left",
                          )}
                          style={{
                            background: `linear-gradient(90deg, transparent, ${v.accentSolid}, transparent)`,
                            opacity: 0.55,
                          }}
                        />

                        <div
                          className={cn(
                            "flex items-start justify-between gap-4",
                            isLeft && "md:flex-row-reverse md:text-right",
                          )}
                        >
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                              {v.label}
                            </div>
                            <h3 className="mt-2 font-heading text-lg font-bold tracking-tight text-foreground">
                              {v.version}
                            </h3>
                          </div>

                          <Badge
                            className="font-mono text-xs"
                            style={{
                              backgroundColor: `${v.accentSolid}18`,
                              borderColor: `${v.accentSolid}45`,
                              color: v.accentSolid,
                            }}
                            variant="outline"
                          >
                            {v.date}
                          </Badge>
                        </div>

                        <p className="mt-4 text-sm leading-7 text-muted-foreground">
                          {v.description}
                        </p>

                        {v.current && (
                          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_oklch(0.64_0.2_145/0.55)]" />
                            Live baseline
                          </div>
                        )}
                      </article>

                      <div className="hidden md:flex md:w-16 md:shrink-0 md:items-center md:justify-center md:z-10">
                        <TimelineDot
                          accentSolid={v.accentSolid}
                          current={v.current}
                          fillOpacity={fillOpacity}
                          fillScale={fillScale}
                          registerDot={(el) => {
                            dotRefs.current[i] = el;
                          }}
                        />
                      </div>

                      <div className="hidden md:block md:w-[calc(50%-2rem)] md:flex-none" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ViewportAnimation>
      </div>
    </section>
  );
};

JourneySection.displayName = "JourneySection";
