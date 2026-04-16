import { motion, useReducedMotion } from "motion/react";
import { memo } from "react";

import { SectionWrapper } from "@/components/common/section-wrapper";
import { ANIMATION_CONFIG } from "@/components/ui/animation-constants";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

interface TechLogo {
  name: string;
  light: string;
  dark?: string;
  swapColors?: boolean;
}

export const TECH_LOGOS: TechLogo[] = [
  // Core Framework
  { dark: "/tech-stack/react_dark.svg", light: "/tech-stack/react_light.svg", name: "React" },
  { light: "/tech-stack/tanstack.svg", name: "TanStack Start" },
  { light: "/tech-stack/typescript.svg", name: "TypeScript" },
  // Styling & UI
  { light: "/tech-stack/tailwindcss.svg", name: "Tailwind CSS" },
  {
    dark: "/tech-stack/shadcn_dark.svg",
    light: "/tech-stack/shadcn_light.svg",
    name: "shadcn/ui",
    swapColors: true,
  },
  {
    dark: "/tech-stack/motion_dark.svg",
    light: "/tech-stack/Motion_light.svg",
    name: "Motion",
    swapColors: true,
  },
  // Maps
  { light: "/tech-stack/maplibre.svg", name: "MapLibre" },
  { light: "/tech-stack/mapcn.svg", name: "mapcn" },
  // Validation
  { light: "/tech-stack/valibot.svg", name: "Valibot" },
  // Tools
  { light: "/tech-stack/bun.svg", name: "Bun" },
  {
    dark: "/tech-stack/cursor_dark.svg",
    light: "/tech-stack/cursor_light.svg",
    name: "Cursor",
    swapColors: true,
  },
  { light: "/tech-stack/lefthook.svg", name: "Lefthook" },
  { light: "/tech-stack/semantic-release-logo.svg", name: "Semantic Release" },
];

export const TechStackSection = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <SectionWrapper id="tech-stack">
      <section className="overflow-hidden bg-background py-20 sm:py-24 lg:py-32">
        <div className="group relative m-auto max-w-7xl px-6">
          <motion.div
            className="mb-16 text-center sm:mb-20 lg:mb-24"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            transition={{
              duration: ANIMATION_CONFIG.durations.fast,
              ease: ANIMATION_CONFIG.ease,
            }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          >
            <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl lg:text-5xl xl:text-6xl">
              Built with <span className="gradient-text font-extrabold">Modern Technologies</span>
            </h2>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg lg:text-xl">
              Leveraging the latest web technologies to create a fast, reliable, and beautiful user
              experience.
            </p>
          </motion.div>

          <div className="flex flex-col items-center md:flex-row md:items-center">
            <div className="mb-6 flex items-center justify-center md:mb-0 md:max-w-48 md:self-center md:border-r md:pr-8 md:text-end lg:max-w-56 lg:pr-12">
              <p className="text-base sm:text-lg lg:text-xl">Powering the metro station</p>
            </div>
            <div className="relative flex items-center py-8 md:w-[calc(100%-14rem)] lg:w-[calc(100%-18rem)] lg:py-12">
              <InfiniteSlider gap={140} speed={40} speedOnHover={20}>
                {TECH_LOGOS.map((tech) => (
                  <div className="flex" key={tech.name}>
                    {tech.dark ? (
                      <>
                        <img
                          alt={`${tech.name} logo`}
                          className="mx-auto h-12 w-fit sm:h-14 lg:h-16 dark:hidden"
                          height={64}
                          src={tech.swapColors ? tech.light : tech.dark}
                          width="auto"
                        />
                        <img
                          alt={`${tech.name} logo`}
                          className="mx-auto hidden h-12 w-fit sm:h-14 lg:h-16 dark:block"
                          height={64}
                          src={tech.swapColors ? tech.dark : tech.light}
                          width="auto"
                        />
                      </>
                    ) : (
                      <img
                        alt={`${tech.name} logo`}
                        className="mx-auto h-12 w-fit sm:h-14 lg:h-16"
                        height={64}
                        src={tech.light}
                        width="auto"
                      />
                    )}
                  </div>
                ))}
              </InfiniteSlider>

              <div className="absolute inset-y-0 left-0 w-20 bg-linear-to-r from-background" />
              <div className="absolute inset-y-0 right-0 w-20 bg-linear-to-l from-background" />

              <ProgressiveBlur
                blurIntensity={1}
                className="pointer-events-none absolute top-0 left-0 h-full w-20"
                direction="left"
              />
              <ProgressiveBlur
                blurIntensity={1}
                className="pointer-events-none absolute top-0 right-0 h-full w-20"
                direction="right"
              />
            </div>
          </div>
        </div>
      </section>
    </SectionWrapper>
  );
});

TechStackSection.displayName = "TechStackSection";
