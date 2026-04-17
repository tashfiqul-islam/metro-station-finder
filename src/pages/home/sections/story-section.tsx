import { CheckCircle, Lightbulb, SmileySad, Wrench } from "@phosphor-icons/react";
import type { ReactElement } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";

interface StoryItem {
  ordinal: string;
  icon: ReactElement;
  title: string;
  description: string;
}

const stories: StoryItem[] = [
  {
    description:
      "Navigating Dhaka's new MRT Line 6 meant hunting through scattered PDFs, outdated maps, and unofficial fare tables — every commute a small research project.",
    icon: <SmileySad size={28} weight="duotone" />,
    ordinal: "01",
    title: "Frustration",
  },
  {
    description:
      "A simple idea: one tool that answers every MRT question instantly. Stations, fares, routes — all in one clean interface built for real commuters.",
    icon: <Lightbulb size={28} weight="duotone" />,
    ordinal: "02",
    title: "Inspiration",
  },
  {
    description:
      "Built metro-station-finder with real fare data, interactive maps, and trip planning — a purpose-built tool that respects the commuter's time.",
    icon: <Wrench size={28} weight="duotone" />,
    ordinal: "03",
    title: "Solution",
  },
  {
    description:
      "Thousands of Dhaka commuters now plan their MRT journeys faster. No more guessing fares or missing stations — just clear, reliable transit information.",
    icon: <CheckCircle size={28} weight="duotone" />,
    ordinal: "04",
    title: "Impact",
  },
];

export const StorySection = (): ReactElement => (
  <section className="py-20">
    <div className="container mx-auto px-4">
      <ViewportAnimation>
        <div className="mb-12">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold">How it started</h2>
        </div>
      </ViewportAnimation>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {stories.map((story, index) => (
          <ViewportAnimation key={story.ordinal} delay={index * 0.1}>
            <div className="relative">
              <span
                className="absolute -top-4 left-0 font-heading text-8xl font-black text-primary/8 select-none pointer-events-none leading-none"
                aria-hidden="true"
              >
                {story.ordinal}
              </span>
              <div className="relative z-10 pt-8">
                <div className="text-primary">{story.icon}</div>
                <h3 className="font-heading text-xl font-bold mt-3 mb-2">{story.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{story.description}</p>
              </div>
            </div>
          </ViewportAnimation>
        ))}
      </div>
    </div>
  </section>
);
