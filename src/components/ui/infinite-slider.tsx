import { animate, motion, useMotionValue } from "motion/react";
import { useEffect, useState } from "react";
import useMeasure from "react-use-measure";
import { cn } from "@/lib/utils";

export interface InfiniteSliderProps {
  children: React.ReactNode;
  gap?: number;
  speed?: number;
  speedOnHover?: number;
  direction?: "horizontal" | "vertical";
  reverse?: boolean;
  className?: string;
}

export const InfiniteSlider = ({
  children,
  gap = 16,
  speed = 100,
  speedOnHover,
  direction = "horizontal",
  reverse = false,
  className,
}: InfiniteSliderProps): React.ReactElement => {
  const [currentSpeed, setCurrentSpeed] = useState(speed);
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [key, setKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: key is intentionally used to trigger re-render when transitioning
  useEffect(() => {
    let controls: ReturnType<typeof animate> | undefined;
    const size = direction === "horizontal" ? width : height;
    const contentSize = size + gap;
    const from = reverse ? -(3 * contentSize) / 4 : -contentSize / 4;
    const to = reverse ? -contentSize / 4 : -(3 * contentSize) / 4;

    const distanceToTravel = Math.abs(to - from);
    const duration = distanceToTravel / currentSpeed;

    if (isTransitioning) {
      const remainingDistance = Math.abs(translation.get() - to);
      const transitionDuration = remainingDistance / currentSpeed;

      controls = animate(translation, [translation.get(), to], {
        duration: transitionDuration,
        ease: "linear",
        onComplete: () => {
          setIsTransitioning(false);
          setKey((prevKey) => prevKey + 1);
        },
      });
    } else {
      controls = animate(translation, [from, to], {
        duration,
        ease: "linear",
        onRepeat: () => {
          translation.set(from);
        },
        repeat: Number.POSITIVE_INFINITY,
        repeatDelay: 0,
        repeatType: "loop",
      });
    }

    return controls?.stop;
  }, [translation, currentSpeed, width, height, gap, isTransitioning, direction, reverse, key]);

  const hoverProps = speedOnHover
    ? {
        onHoverEnd: () => {
          setIsTransitioning(true);
          setCurrentSpeed(speed);
        },
        onHoverStart: () => {
          setIsTransitioning(true);
          setCurrentSpeed(speedOnHover);
        },
      }
    : {};

  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex w-max"
        ref={ref}
        style={{
          ...(direction === "horizontal" ? { x: translation } : { y: translation }),
          flexDirection: direction === "horizontal" ? "row" : "column",
          gap: `${gap}px`,
        }}
        {...hoverProps}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
};
