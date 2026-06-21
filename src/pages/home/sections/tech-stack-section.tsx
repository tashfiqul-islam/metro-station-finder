import { memo } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { SectionHeading } from "@/pages/home/components/section-heading";

interface TechItem {
  logoDark: string;
  logoLight: string;
  name: string;
  role: string;
}

const makeItem = (name: string, file: string, role: string): TechItem => ({
  logoDark: `/tech-stack/${file}`,
  logoLight: `/tech-stack/${file}`,
  name,
  role,
});

const makeDualItem = (name: string, dark: string, light: string, role: string): TechItem => ({
  logoDark: `/tech-stack/${dark}`,
  logoLight: `/tech-stack/${light}`,
  name,
  role,
});

export const row1Items: TechItem[] = [
  makeDualItem("React", "react_dark.svg", "react_light.svg", "UI Runtime"),
  makeItem("TypeScript", "typescript.svg", "Language"),
  makeItem("TanStack", "tanstack.svg", "Framework"),
  makeItem("Tailwind CSS", "tailwindcss.svg", "Styling"),
  makeDualItem("shadcn/ui", "shadcn_dark.svg", "shadcn_light.svg", "UI System"),
  makeItem("Bun", "bun.svg", "Runtime"),
  makeItem("MapLibre", "maplibre.svg", "Maps"),
];

export const row2Items: TechItem[] = [
  makeItem("Valibot", "valibot.svg", "Validation"),
  makeItem("mapcn", "mapcn.svg", "Map UI"),
  makeItem("Lefthook", "lefthook.svg", "Git Hooks"),
  makeItem("Semantic Release", "semantic-release-logo.svg", "Release Flow"),
  makeDualItem("Zed", "zed-logo-dark.svg", "zed-logo-light.svg", "Editor"),
];

const stackPrinciples = ["Static first", "Clear by default", "Made for repeat use"] as const;

interface TechItemCardProps {
  logoDark: string;
  logoLight: string;
  name: string;
  role: string;
}

const TechItemCard = memo(
  ({ logoDark, logoLight, name, role }: TechItemCardProps): React.ReactElement => (
    <div className="group mx-2 flex min-w-52 items-center gap-3 rounded-lg border border-border/40 bg-background/70 px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-background/90 hover:shadow-[0_10px_30px_oklch(0.50_0.18_145/0.10)]">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/35 bg-muted/70 p-2 transition-colors duration-300 group-hover:border-primary/20 group-hover:bg-primary/5">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold tracking-tight text-foreground">
          {name}
        </span>
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
          {role}
        </span>
      </div>
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
      className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-linear-to-r from-background via-background/95 to-transparent md:w-28"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-linear-to-l from-background via-background/95 to-transparent md:w-28"
    />
    <InfiniteSlider reverse={reverse} speed={speed}>
      {children}
    </InfiniteSlider>
  </div>
);

export const TechStackSection = memo(
  (): React.ReactElement => (
    <section className="relative overflow-x-clip py-24 lg:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(52% 38% at 50% 0%, oklch(0.50 0.18 145 / 0.08), transparent), radial-gradient(32% 22% at 80% 60%, oklch(0.64 0.2 145 / 0.05), transparent)",
        }}
      />

      <div className="container relative mx-auto px-4">
        <ViewportAnimation>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-end">
            <SectionHeading
              className="max-w-2xl"
              description="The product runs on a static-first set of dependable tools chosen to keep the interface fast, the data clear, and the experience steady every time someone checks a route."
              descriptionClassName="mt-4 max-w-xl leading-relaxed"
              eyebrow="The Stack"
              title="Powered by"
            />

            <div className="grid gap-3 sm:grid-cols-3 lg:justify-self-end">
              {stackPrinciples.map((principle) => (
                <div className="section-card px-4 py-4 text-center shadow-sm" key={principle}>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/65">
                    {principle}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ViewportAnimation>

        <ViewportAnimation delay={0.08}>
          <div className="section-panel mt-14 overflow-hidden">
            <div className="border-b border-border/40 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_oklch(0.64_0.2_145/0.55)]" />
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    metro-station-finder / built with purpose
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  <span>Fast loading</span>
                  <span aria-hidden className="h-1 w-1 rounded-full bg-border-strong" />
                  <span>Reliable every visit</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, oklch(0 0 0 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, oklch(0 0 0 / 0.04) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />

              <div className="relative px-2 py-4 sm:px-3 sm:py-5">
                <SliderRow speed={52}>
                  {row1Items.map((item) => (
                    <TechItemCard
                      key={item.name}
                      logoDark={item.logoDark}
                      logoLight={item.logoLight}
                      name={item.name}
                      role={item.role}
                    />
                  ))}
                </SliderRow>

                <div className="mx-6 h-px bg-linear-to-r from-transparent via-border/55 to-transparent sm:mx-8" />

                <SliderRow reverse speed={38}>
                  {row2Items.map((item) => (
                    <TechItemCard
                      key={item.name}
                      logoDark={item.logoDark}
                      logoLight={item.logoLight}
                      name={item.name}
                      role={item.role}
                    />
                  ))}
                </SliderRow>
              </div>
            </div>
          </div>
        </ViewportAnimation>
      </div>
    </section>
  ),
);

TechStackSection.displayName = "TechStackSection";
