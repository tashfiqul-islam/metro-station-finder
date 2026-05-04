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

const getDuration = (speed: number): string => `${Math.max(18, Math.round(2600 / speed))}s`;

export const InfiniteSlider = ({
  children,
  gap = 16,
  speed = 100,
  direction = "horizontal",
  reverse = false,
  className,
}: InfiniteSliderProps): React.ReactElement => (
  <div className={cn("overflow-x-clip", className)}>
    <div
      className="flex w-max will-change-transform"
      style={{
        animation: `msf-marquee ${getDuration(speed)} linear infinite`,
        animationDirection: reverse ? "reverse" : "normal",
        flexDirection: direction === "horizontal" ? "row" : "column",
        gap: `${gap}px`,
      }}
    >
      {children}
      {children}
      {children}
      {children}
    </div>
  </div>
);
