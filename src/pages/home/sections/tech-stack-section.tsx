import { useReducedMotion } from "motion/react";
import { memo } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { InfiniteSlider } from "@/components/ui/infinite-slider";

interface TechItem {
  color: string;
  name: string;
}

export const row1Items: TechItem[] = [
  { color: "oklch(0.84 0.12 196)", name: "React" },
  { color: "oklch(0.57 0.19 249)", name: "TypeScript" },
  { color: "oklch(0.64 0.2 145)", name: "TanStack" },
  { color: "oklch(0.75 0.14 195)", name: "Tailwind CSS" },
  { color: "oklch(0.63 0.19 284)", name: "Vite" },
];

export const row2Items: TechItem[] = [
  { color: "oklch(0.65 0 0)", name: "shadcn/ui" },
  { color: "oklch(0.78 0.13 75)", name: "Bun" },
  { color: "oklch(0.65 0.18 142)", name: "Vitest" },
  { color: "oklch(0.59 0.19 253)", name: "MapLibre" },
  { color: "oklch(0.61 0.23 299)", name: "Phosphor" },
];

interface TechItemCardProps {
  color: string;
  name: string;
}

const TechItemCard = memo(
  ({ color, name }: TechItemCardProps): React.ReactElement => (
    <div className="group mx-2 flex cursor-default items-center gap-2.5 rounded-full border border-border/50 bg-card/30 px-5 py-2.5 transition-all duration-300 hover:bg-card/80 hover:shadow-sm">
      {/* Brand-color dot — glows on hover via currentColor shadow */}
      <span
        aria-hidden
        className="h-2 w-2 flex-shrink-0 rounded-full transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_8px_currentColor]"
        style={{ background: color, color }}
      />
      <span className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
        {name}
      </span>
    </div>
  ),
);

TechItemCard.displayName = "TechItemCard";

export const TechStackSection = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="overflow-hidden py-24 lg:py-32">
      {/* ── Heading block ── */}
      <div className="container mx-auto mb-16 px-4">
        <ViewportAnimation>
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Eyebrow */}
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-primary/50" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                The Stack
              </span>
              <div className="h-px w-8 bg-primary/50" aria-hidden />
            </div>
            {/* Heading */}
            <h2 className="font-heading text-4xl font-black tracking-tight lg:text-5xl xl:text-6xl">
              Powered by
            </h2>
            {/* Description */}
            <p className="mt-1 max-w-sm text-base text-muted-foreground">
              Open-source tools, meticulously chosen for performance and developer experience.
            </p>
          </div>
        </ViewportAnimation>
      </div>

      {/* ── Marquee rows ── */}
      <div className="flex flex-col gap-5">
        <InfiniteSlider speed={shouldReduceMotion ? 0.01 : 60}>
          {row1Items.map((item) => (
            <TechItemCard color={item.color} key={item.name} name={item.name} />
          ))}
        </InfiniteSlider>
        <InfiniteSlider reverse speed={shouldReduceMotion ? 0.01 : 40}>
          {row2Items.map((item) => (
            <TechItemCard color={item.color} key={item.name} name={item.name} />
          ))}
        </InfiniteSlider>
      </div>
    </section>
  );
});

TechStackSection.displayName = "TechStackSection";
