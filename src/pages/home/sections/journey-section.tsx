import { memo } from "react";

import { SectionWrapper } from "@/components/common/section-wrapper";
import { Timeline } from "@/components/ui/timeline";

const timelineData = [
  {
    description:
      "Launched the first version with core station finder functionality. Built on Next.js 14 with page router architecture and foundational CSS styling. Focused on solving the essential problem: helping commuters locate metro stations quickly.",
    title: "The Beginning",
    version: "v0.0.1",
  },
  {
    description:
      "Introduced fare calculator functionality and upgraded the design system with Tailwind CSS. Improved user experience with better visual hierarchy and modern styling patterns.",
    title: "Enhanced Features",
    version: "v0.0.2",
  },
  {
    description:
      "Migrated from Next.js to TanStack Start with Tailwind 4, Valibot validation, mapcn + MapLibre maps, and an AI-powered natural language station finder. Complete design system overhaul with glassmorphism, Phosphor icons, and shadcn/ui primitives.",
    title: "v1.0.0 — 2026 Rebuild",
    version: "v1.0.0 — 2026 Rebuild",
  },
  {
    description:
      "Completely redesigned with Tailwind CSS, shadcn/ui components, and intuitive interactions. Created a cohesive design language that prioritizes user experience and visual excellence.",
    title: "Design System Overhaul",
    version: "v1.0.0",
  },
  {
    description:
      "Optimized for blazing-fast performance with intuitive UI patterns and full mobile responsiveness. Every interaction is smooth, every feature is accessible, and every detail is refined.",
    title: "Performance & Polish",
    version: "v1.0.0",
  },
];

export const JourneySection = memo((): React.ReactElement => {
  const timelineEntries = timelineData.map((item, index) => {
    const isEven = index % 2 === 0;
    return {
      content: (
        <div className="glass-card group relative overflow-hidden rounded-2xl transition-all duration-300">
          <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-transparent dark:from-primary/5 dark:via-transparent dark:to-primary/10 dark:opacity-50" />
          <div className="relative p-6 sm:p-8">
            <div
              className={`mb-3 flex items-center gap-3 ${isEven ? "md:justify-end" : "md:justify-start"}`}
            >
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 font-semibold text-primary text-xs shadow-sm transition-colors dark:border-primary/50 dark:bg-primary/20 dark:text-primary dark:shadow-lg dark:ring-1 dark:ring-primary/30 dark:backdrop-blur-sm">
                {item.version}
              </span>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed">{item.description}</p>
          </div>
        </div>
      ),
      title: item.title,
    };
  });

  return (
    <SectionWrapper id="journey">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mb-12 text-center sm:mb-16 lg:mb-20">
          <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl lg:text-5xl">
            And the <span className="gradient-text font-extrabold">Journey Began</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg">
            From concept to reality - the journey of building Metro Station Finder
          </p>
        </div>

        <Timeline data={timelineEntries} showHeader={false} />
      </div>
    </SectionWrapper>
  );
});

JourneySection.displayName = "JourneySection";
