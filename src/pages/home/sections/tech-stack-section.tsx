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
  makeDualItem("Zed", "zed-logo-dark.svg", "zed-logo-light.svg"),
];

interface TechItemCardProps {
  logoDark: string;
  logoLight: string;
  name: string;
}

const TechItemCard = memo(
  ({ logoDark, logoLight, name }: TechItemCardProps): React.ReactElement => (
    <div className="group mx-2 flex cursor-default items-center gap-3 rounded-2xl border border-border/40 px-4 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-[0_8px_32px_oklch(0.50_0.18_145_/_0.20)] hover:ring-1 hover:ring-primary/20">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/30 bg-background/70 p-1.5 transition-colors duration-300 group-hover:border-primary/20 group-hover:bg-background">
        <img
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain dark:hidden"
          src={logoLight}
        />
        <img
          alt=""
          aria-hidden="true"
          className="hidden h-full w-full object-contain dark:block"
          src={logoDark}
        />
      </div>
      <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
        {name}
      </span>
    </div>
  ),
);

TechItemCard.displayName = "TechItemCard";

const SliderRow = ({
  children,
  reverse,
  speed,
}: {
  children: React.ReactNode;
  reverse?: boolean;
  speed: number;
}): React.ReactElement => (
  <div className="relative py-3">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent"
    />
    <InfiniteSlider reverse={reverse} speed={speed}>
      {children}
    </InfiniteSlider>
  </div>
);

export const TechStackSection = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-x-hidden py-24 lg:py-32">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 0%, oklch(0.50 0.18 145 / 0.08), transparent)",
        }}
      />

      {/* ── Heading block ── */}
      <div className="container relative mx-auto mb-16 px-4">
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

      {/* ── Marquee rows ── */}
      <div className="relative flex flex-col gap-1">
        <SliderRow speed={shouldReduceMotion ? 0.01 : 55}>
          {row1Items.map((item) => (
            <TechItemCard
              key={item.name}
              logoDark={item.logoDark}
              logoLight={item.logoLight}
              name={item.name}
            />
          ))}
        </SliderRow>

        <SliderRow reverse speed={shouldReduceMotion ? 0.01 : 38}>
          {row2Items.map((item) => (
            <TechItemCard
              key={item.name}
              logoDark={item.logoDark}
              logoLight={item.logoLight}
              name={item.name}
            />
          ))}
        </SliderRow>
      </div>
    </section>
  );
});

TechStackSection.displayName = "TechStackSection";
