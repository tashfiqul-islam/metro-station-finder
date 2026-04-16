import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface TimelineEntry {
  readonly title: string;
  readonly content: React.ReactNode;
}

interface TimelineProps {
  readonly data: TimelineEntry[];
  readonly showHeader?: boolean;
}

interface CircleMarkerProps {
  readonly circleRef: (el: HTMLDivElement | null) => void;
  readonly scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  readonly height: number;
}

/**
 * Animated circle marker that fills with primary color as scroll progress reaches its position.
 */
const CircleMarker = ({ circleRef, scrollYProgress, height }: CircleMarkerProps) => {
  const [circlePosition, setCirclePosition] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const circleElementRef = useRef<HTMLDivElement | null>(null);
  const fillOpacity = useMotionValue(0);
  const fillScale = useMotionValue(0.8);
  const fillVisibility = useTransform(fillOpacity, (opacity) =>
    opacity > 0 ? "visible" : "hidden",
  );
  const positionRef = useRef<number | null>(null);
  const heightRef = useRef<number>(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    positionRef.current = circlePosition;
  }, [circlePosition]);

  useEffect(() => {
    heightRef.current = height;
  }, [height]);

  useEffect(() => {
    if (!initializedRef.current) {
      fillOpacity.set(0);
      fillScale.set(0.8);
      initializedRef.current = true;
    }
  }, [fillOpacity, fillScale]);

  const updatePosition = useCallback(() => {
    const container = circleElementRef.current?.parentElement?.parentElement;
    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const circleRect = circleElementRef.current?.getBoundingClientRect();
    if (!circleRect) {
      return;
    }

    const position = circleRect.top - containerRect.top + circleRect.height / 2;

    if (position > 0 && position < Number.MAX_SAFE_INTEGER) {
      setCirclePosition(position);
      // Double RAF ensures layout is fully settled before enabling animations
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    }
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updatePosition);
    });

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(updatePosition);
      });
    });

    const element = circleElementRef.current;
    if (element) {
      resizeObserver.observe(element);
    }

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [updatePosition]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const currentPosition = positionRef.current;
    const currentHeight = heightRef.current;

    if (!isReady || currentPosition === null || currentHeight === 0 || currentPosition <= 0) {
      fillOpacity.set(0);
      fillScale.set(0.8);
      return;
    }

    const scrollHeight = latest * currentHeight;
    const startFill = Math.max(0, currentPosition - 10);
    const endFill = currentPosition + 10;

    // Calculate fill opacity based on scroll progress relative to circle position
    let opacity = 0;
    if (scrollHeight >= startFill && scrollHeight > 0) {
      opacity =
        scrollHeight <= endFill
          ? Math.min(1, (scrollHeight - startFill) / (endFill - startFill))
          : 1;
    }

    opacity = Math.max(0, Math.min(1, opacity));
    fillOpacity.set(opacity);
    fillScale.set(0.8 + opacity * 0.2);
  });

  return (
    <div
      className="relative z-20 order-1 mx-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white md:order-2 dark:bg-black"
      ref={(el) => {
        circleElementRef.current = el;
        circleRef(el);
      }}
    >
      <div className="h-4 w-4 rounded-full border border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800" />

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: fillOpacity,
          pointerEvents: "none",
          scale: fillScale,
          visibility: fillVisibility,
        }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        <div
          className="timeline-circle-glow h-4 w-4 rounded-full"
          style={{ backgroundColor: "var(--color-primary)" }}
        />
      </motion.div>
    </div>
  );
};

/**
 * Scroll-animated timeline component with alternating layout and progress indicators.
 */
export const Timeline = ({ data, showHeader = true }: TimelineProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      setHeight(element.getBoundingClientRect().height);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const { scrollYProgress } = useScroll({
    offset: ["start 40%", "end 50%"],
    target: containerRef,
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div className="w-full bg-transparent font-sans md:px-10" ref={containerRef}>
      {showHeader && (
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 lg:px-10">
          <h2 className="mb-4 max-w-4xl text-foreground text-lg md:text-4xl">
            Changelog from my journey
          </h2>
          <p className="max-w-sm text-muted-foreground text-sm md:text-base">
            I&apos;ve been working on Aceternity for the past 2 years. Here&apos;s a timeline of my
            journey.
          </p>
        </div>
      )}

      <div className="relative mx-auto max-w-7xl pb-20" ref={ref}>
        <div
          className="md:-translate-x-1/2 absolute top-0 left-[calc(1rem+1.25rem-1px)] z-0 w-[2px] overflow-hidden md:left-1/2"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
            height: `${height}px`,
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
          }}
        >
          <div
            className="absolute inset-x-0 top-0 z-0 w-[2px] bg-linear-to-b from-transparent via-primary/10 to-transparent dark:via-primary/5"
            style={{ height: `${height}px` }}
          />
          <motion.div
            className="absolute inset-x-0 top-0 z-10 w-[2px] rounded-full"
            style={{
              backgroundImage:
                "linear-gradient(to top, var(--color-primary) 0%, oklch(from var(--color-primary) min(calc(l + 0.15), 0.95) c h) 10%, transparent 100%)",
              height: heightTransform,
              maxHeight: "100%",
              opacity: opacityTransform,
              willChange: "height, opacity",
            }}
          />
        </div>

        {data.map((item, index) => {
          const isEven = index % 2 === 0;
          const isFirst = index === 0;

          return (
            <div
              className={`relative flex items-center ${isFirst ? "pt-0" : "pt-10 md:pt-40"} ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}
              key={item.title}
            >
              <div
                className={`order-2 w-full md:order-1 md:w-[calc(50%-2rem)] ${isEven ? "md:pr-8 md:text-right" : "md:pl-8 md:text-left"}`}
              >
                <div className="relative">
                  <h3 className="mb-4 block text-left font-bold text-2xl text-neutral-500 md:hidden dark:text-neutral-500">
                    {item.title}
                  </h3>
                  {item.content}
                </div>
              </div>

              <CircleMarker
                circleRef={(el) => {
                  circleRefs.current[index] = el;
                }}
                height={height}
                scrollYProgress={scrollYProgress}
              />

              <div
                className={`hidden w-full md:order-3 md:block md:w-[calc(50%-2rem)] ${isEven ? "md:pl-8 md:text-left" : "md:pr-8 md:text-right"}`}
              >
                <h3 className="font-bold text-neutral-500 text-xl md:text-5xl dark:text-neutral-500">
                  {item.title}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
