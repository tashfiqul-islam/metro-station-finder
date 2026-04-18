import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Badge } from "@/components/ui/badge";
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

interface TimelineDotProps {
  accentSolid: string;
  current: boolean;
  height: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}

const TimelineDot = ({
  accentSolid,
  current,
  height,
  scrollYProgress,
}: TimelineDotProps): React.ReactElement => {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dotPosition, setDotPosition] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const positionRef = useRef<number | null>(null);
  const heightRef = useRef(0);

  const fillOpacity = useMotionValue(0);
  const fillScale = useMotionValue(0.6);

  useEffect(() => {
    positionRef.current = dotPosition;
  }, [dotPosition]);

  useEffect(() => {
    heightRef.current = height;
  }, [height]);

  const measurePosition = useCallback(() => {
    const container = containerRef.current?.closest("[data-timeline-ref]");
    const dot = dotRef.current;
    if (!container || !dot) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const dotRect = dot.getBoundingClientRect();
    const pos = dotRect.top - containerRect.top + dotRect.height / 2;
    if (pos > 0) {
      setDotPosition(pos);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsReady(true)));
    }
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(measurePosition));
    const ro = new ResizeObserver(() =>
      requestAnimationFrame(() => requestAnimationFrame(measurePosition)),
    );
    if (dotRef.current) {
      ro.observe(dotRef.current);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [measurePosition]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const pos = positionRef.current;
    const h = heightRef.current;
    if (!isReady || pos === null || h === 0) {
      fillOpacity.set(0);
      fillScale.set(0.6);
      return;
    }
    const scrollPx = latest * h;
    const start = Math.max(0, pos - 12);
    const end = pos + 12;
    let t = 0;
    if (scrollPx >= start) {
      t = scrollPx > end ? 1 : (scrollPx - start) / (end - start);
    }
    fillOpacity.set(t);
    fillScale.set(0.6 + t * 0.4);
  });

  return (
    <div
      className="relative z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background"
      ref={(el) => {
        dotRef.current = el;
        containerRef.current = el;
      }}
    >
      {/* Static ring */}
      <div
        className="h-3.5 w-3.5 rounded-full border-2"
        style={{
          backgroundColor: current ? `${accentSolid.replace(")", " / 0.12)")}` : "transparent",
          borderColor: current ? accentSolid : "oklch(var(--border))",
        }}
      />
      {/* Scroll-driven fill */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ opacity: fillOpacity, scale: fillScale }}
      >
        <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: accentSolid }} />
      </motion.div>
      {/* Current pulse ring */}
      {current && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{ borderColor: accentSolid, opacity: fillOpacity }}
          animate={{
            boxShadow: [
              `0 0 0 0 ${accentSolid.replace(")", " / 0.4)")}`,
              `0 0 0 6px ${accentSolid.replace(")", " / 0)")}`,
            ],
          }}
          transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
        />
      )}
    </div>
  );
};

export const JourneySection = (): React.ReactElement => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) {
      return;
    }
    const update = () => setContainerHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

        {/* ── Timeline ── */}
        <div className="relative mx-auto max-w-3xl" data-timeline-ref ref={timelineRef}>
          {/* Track wrapper */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-5 top-0 w-px -translate-x-1/2 md:left-1/2"
            style={{
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)",
            }}
          >
            {/* Ghost rail */}
            <div
              className="absolute inset-0 w-px"
              style={{ background: "oklch(0.64 0.2 145 / 0.13)" }}
            />
            {/* Scroll-driven fill */}
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
                <ViewportAnimation delay={i * 0.1} key={v.version}>
                  <div
                    className={cn(
                      "relative flex items-start pl-14",
                      "md:items-center md:pl-0",
                      isLeft ? "md:flex-row" : "md:flex-row-reverse",
                    )}
                  >
                    {/* Mobile dot */}
                    <div className="absolute left-5 top-5 -translate-x-1/2 z-10 md:hidden">
                      <TimelineDot
                        accentSolid={v.accentSolid}
                        current={v.current}
                        height={containerHeight}
                        scrollYProgress={scrollYProgress}
                      />
                    </div>

                    {/* Card */}
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
                      {/* Accent stripe */}
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

                      {/* Top shimmer */}
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

                      {/* Corner bloom */}
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

                    {/* Desktop center dot */}
                    <div className="hidden md:flex md:w-16 md:shrink-0 md:items-center md:justify-center md:z-10">
                      <TimelineDot
                        accentSolid={v.accentSolid}
                        current={v.current}
                        height={containerHeight}
                        scrollYProgress={scrollYProgress}
                      />
                    </div>

                    {/* Desktop spacer */}
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
