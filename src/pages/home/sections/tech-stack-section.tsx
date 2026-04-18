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
    <div
      className="group mx-2 flex cursor-default items-center gap-3 rounded-2xl border border-border/50 bg-card/40 px-5 py-3 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border/80 hover:bg-card/70 hover:shadow-[0_6px_24px_var(--tech-glow)]"
      style={
        {
          "--tech-glow": `${color.replace(")", " / 0.22)")}`,
        } as React.CSSProperties
      }
    >
      {/* Color swatch — rounded square with brand hue */}
      <span
        aria-hidden
        className="h-3 w-3 shrink-0 rounded-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_10px_var(--tech-glow)]"
        style={{ background: color }}
      />
      <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
        {name}
      </span>
    </div>
  ),
);

TechItemCard.displayName = "TechItemCard";

const EDGE_MASK = {
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
  maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
} as React.CSSProperties;

export const TechStackSection = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="overflow-hidden py-24 lg:py-32">
      {/* ── Heading block ── */}
      <div className="container mx-auto mb-16 px-4">
        <ViewportAnimation>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-3">
              <div aria-hidden className="h-px w-8 bg-primary/50" />
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                The Stack
              </span>
              <div aria-hidden className="h-px w-8 bg-primary/50" />
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
              Powered by
            </h2>

            <p className="mt-1 max-w-sm text-base text-muted-foreground">
              Open-source tools, meticulously chosen for performance and developer experience.
            </p>
          </div>
        </ViewportAnimation>
      </div>

      {/* ── Marquee rows with edge fade masks ── */}
      <div className="flex flex-col gap-4">
        <div style={EDGE_MASK}>
          <InfiniteSlider speed={shouldReduceMotion ? 0.01 : 60}>
            {row1Items.map((item) => (
              <TechItemCard color={item.color} key={item.name} name={item.name} />
            ))}
          </InfiniteSlider>
        </div>

        <div style={EDGE_MASK}>
          <InfiniteSlider reverse speed={shouldReduceMotion ? 0.01 : 40}>
            {row2Items.map((item) => (
              <TechItemCard color={item.color} key={item.name} name={item.name} />
            ))}
          </InfiniteSlider>
        </div>
      </div>
    </section>
  );
});

TechStackSection.displayName = "TechStackSection";
