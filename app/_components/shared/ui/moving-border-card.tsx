"use client";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "motion/react";
import type React from "react";
import { useCallback, useRef } from "react";
import { useCustomLoading } from "@/lib/hooks/loading/use-custom-loading";
import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";
import { cn } from "@/lib/utils";

const DEFAULT_DURATION = 3000;

export function MovingBorderCard({
  borderRadius = "1.75rem",
  children,
  containerClassName,
  borderClassName,
  duration,
  className,
  onClick,
  ...otherProps
}: {
  borderRadius?: string;
  children: React.ReactNode;
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
  className?: string;
  onClick?: () => void;
  [key: string]: unknown;
}) {
  // Enhanced hooks for better UX
  const { startPageTransition } = useViewTransitions();
  const { startLoading, completeLoading, isLoading: isCustomLoading } = useCustomLoading();

  const handleClick = useCallback(() => {
    if (onClick) {
      // Start loading indicator for card interaction
      startLoading("card-interaction", {
        message: "Processing...",
        progress: 0,
      });

      // Use View Transitions for smooth interaction
      startPageTransition(() => {
        onClick();

        // Complete loading after a short delay
        const LoadingDelayMs = 300;
        setTimeout(() => {
          completeLoading("card-interaction", "Completed");
        }, LoadingDelayMs);
      });
    }
  }, [onClick, startPageTransition, startLoading, completeLoading]);
  const CardWrapper = onClick ? "button" : "div";

  return (
    <CardWrapper
      className={cn(
        "relative overflow-hidden bg-transparent p-[1px]",
        containerClassName,
        onClick && "cursor-pointer"
      )}
      onClick={handleClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
      style={{
        borderRadius,
      }}
      type={onClick ? "button" : undefined}
      {...otherProps}
    >
      <div className="absolute inset-0" style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}>
        <MovingBorder duration={duration || DEFAULT_DURATION} rx="30%" ry="30%">
          <div
            className={cn(
              "h-20 w-20 bg-[radial-gradient(#10b981_40%,transparent_60%)] opacity-[0.8]",
              borderClassName
            )}
          />
        </MovingBorder>
      </div>

      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center backdrop-blur-xl",
          className
        )}
        style={{
          borderRadius: `calc(${borderRadius} * 0.96)`,
        }}
      >
        {children}
      </div>

      {/* Loading overlay */}
      {isCustomLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-muted-foreground text-sm">Processing...</p>
          </div>
        </div>
      )}
    </CardWrapper>
  );
}

export const MovingBorder = ({
  children,
  duration = 3000,
  rx,
  ry,
  ...otherProps
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  [key: string]: unknown;
}) => {
  const pathRef = useRef<SVGRectElement>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length) {
      const pxPerMillisecond = length / duration;
      progress.set((time * pxPerMillisecond) % length);
    }
  });

  const x = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val).x);
  const y = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val).y);

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <>
      <svg
        aria-label="Moving border animation"
        className="absolute h-full w-full"
        height="100%"
        preserveAspectRatio="none"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        {...otherProps}
      >
        <title>Moving border animation</title>
        <rect fill="none" height="100%" ref={pathRef} rx={rx} ry={ry} width="100%" />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
      >
        {children}
      </motion.div>
    </>
  );
};
