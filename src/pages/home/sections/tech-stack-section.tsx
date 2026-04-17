import { useReducedMotion } from "motion/react";
import { memo } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { InfiniteSlider } from "@/components/ui/infinite-slider";

interface TechItem {
  name: string;
  emoji: string;
}

export const row1Items: TechItem[] = [
  { emoji: "⚛️", name: "React" },
  { emoji: "🔷", name: "TypeScript" },
  { emoji: "🔶", name: "TanStack" },
  { emoji: "🌊", name: "Tailwind CSS" },
  { emoji: "⚡", name: "Vite" },
];

export const row2Items: TechItem[] = [
  { emoji: "◐", name: "shadcn/ui" },
  { emoji: "🍞", name: "Bun" },
  { emoji: "🧪", name: "Vitest" },
  { emoji: "🗺️", name: "MapLibre" },
  { emoji: "✦", name: "Phosphor" },
];

interface TechItemCardProps {
  emoji: string;
  name: string;
}

const TechItemCard = memo(
  ({ emoji, name }: TechItemCardProps): React.ReactElement => (
    <div className="group flex flex-col items-center gap-2 px-6">
      <div className="text-2xl grayscale transition-all duration-300 group-hover:grayscale-0">
        {emoji}
      </div>
      <span className="font-medium text-xs text-muted-foreground transition-colors group-hover:text-foreground">
        {name}
      </span>
    </div>
  ),
);

TechItemCard.displayName = "TechItemCard";

export const TechStackSection = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="overflow-hidden py-20">
      <div className="container mx-auto mb-10 px-4">
        <ViewportAnimation>
          <h2 className="font-heading text-3xl font-bold lg:text-4xl">Built with</h2>
          <p className="mt-2 text-muted-foreground">Modern tools for modern transit.</p>
        </ViewportAnimation>
      </div>
      <div className="flex flex-col gap-6">
        <InfiniteSlider speed={shouldReduceMotion ? 0.01 : 60}>
          {row1Items.map((item) => (
            <TechItemCard emoji={item.emoji} key={item.name} name={item.name} />
          ))}
        </InfiniteSlider>
        <InfiniteSlider reverse speed={shouldReduceMotion ? 0.01 : 40}>
          {row2Items.map((item) => (
            <TechItemCard emoji={item.emoji} key={item.name} name={item.name} />
          ))}
        </InfiniteSlider>
      </div>
    </section>
  );
});

TechStackSection.displayName = "TechStackSection";
