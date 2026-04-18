import { useReducedMotion } from "motion/react";
import { memo } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { InfiniteSlider } from "@/components/ui/infinite-slider";

interface TechItem {
  logoDark: string;
  logoLight: string;
  name: string;
}

const makeItem = (name: string, file: string): TechItem => ({
  logoDark: `/tech-stack/${file}`,
  logoLight: `/tech-stack/${file}`,
  name,
});

const makeDualItem = (name: string, dark: string, light: string): TechItem => ({
  logoDark: `/tech-stack/${dark}`,
  logoLight: `/tech-stack/${light}`,
  name,
});

export const row1Items: TechItem[] = [
  makeDualItem("React", "react_dark.svg", "react_light.svg"),
  makeItem("TypeScript", "typescript.svg"),
  makeItem("TanStack", "tanstack.svg"),
  makeItem("Tailwind CSS", "tailwindcss.svg"),
  makeDualItem("shadcn/ui", "shadcn_dark.svg", "shadcn_light.svg"),
  makeItem("Bun", "bun.svg"),
  makeItem("MapLibre", "maplibre.svg"),
];

export const row2Items: TechItem[] = [
  makeDualItem("Motion", "motion_dark.svg", "Motion_light.svg"),
  makeItem("Valibot", "valibot.svg"),
  makeItem("mapcn", "mapcn.svg"),
  makeItem("Lefthook", "lefthook.svg"),
  makeItem("Semantic Release", "semantic-release-logo.svg"),
  makeDualItem("Cursor", "cursor_dark.svg", "cursor_light.svg"),
];

interface TechItemCardProps {
  logoDark: string;
  logoLight: string;
  name: string;
}

const TechItemCard = memo(
  ({ logoDark, logoLight, name }: TechItemCardProps): React.ReactElement => (
    <div className="group mx-2 flex cursor-default items-center gap-3 rounded-2xl border border-border/50 bg-card/40 px-5 py-3 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/70 hover:shadow-[0_6px_24px_oklch(0.50_0.18_145_/_0.18)]">
      {/* Logo — dark/light aware */}
      <img
        alt=""
        aria-hidden="true"
        className="h-5 w-auto object-contain dark:hidden"
        src={logoLight}
      />
      <img
        alt=""
        aria-hidden="true"
        className="hidden h-5 w-auto object-contain dark:block"
        src={logoDark}
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
              <TechItemCard
                key={item.name}
                logoDark={item.logoDark}
                logoLight={item.logoLight}
                name={item.name}
              />
            ))}
          </InfiniteSlider>
        </div>

        <div style={EDGE_MASK}>
          <InfiniteSlider reverse speed={shouldReduceMotion ? 0.01 : 40}>
            {row2Items.map((item) => (
              <TechItemCard
                key={item.name}
                logoDark={item.logoDark}
                logoLight={item.logoLight}
                name={item.name}
              />
            ))}
          </InfiniteSlider>
        </div>
      </div>
    </section>
  );
});

TechStackSection.displayName = "TechStackSection";
