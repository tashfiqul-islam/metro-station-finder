import { CheckCircle, Lightbulb, MapPinIcon, Target, Users } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { memo } from "react";

import { SectionWrapper } from "@/components/common/section-wrapper";
import { ANIMATION_CONFIG } from "@/components/ui/animation-constants";
import { cn } from "@/lib/utils";

interface StoryStep {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  highlights: string[];
  color: string;
  bgColor: string;
  highlightText?: string;
}

const storySteps: StoryStep[] = [
  {
    bgColor: "bg-red-500",
    color: "text-white",
    description:
      "Every day, thousands of Dhaka commuters face the same frustrating question: 'Where's the nearest metro station?' With no centralized information, people waste precious time searching through multiple maps and apps.",
    highlights: [
      "No centralized metro information",
      "Time-consuming manual searches",
      "Inconsistent station data",
      "Difficulty calculating distances",
    ],
    icon: MapPinIcon,
    id: "frustration",
    title: "The Daily Struggle",
  },
  {
    bgColor: "bg-amber-500",
    color: "text-white",
    description:
      "As a developer who experienced this pain firsthand, I realized the solution was simple: create a single, elegant app that puts all metro information at your fingertips.",
    highlights: [
      "Personal frustration became motivation",
      "Identified the core user needs",
      "Designed for simplicity and speed",
      "Focused on Dhaka's unique challenges",
    ],
    icon: Lightbulb,
    id: "inspiration",
    title: "The Lightbulb Moment",
  },
  {
    bgColor: "bg-green-500",
    color: "text-white",
    description:
      "Metro Station Finder was born - a modern, fast, and intuitive app that transforms the frustrating experience of finding metro stations into something effortless and delightful.",
    highlightText: "Metro Station Finder",
    highlights: [
      "One-click station search",
      "Real-time distance calculation",
      "Instant fare estimation",
      "Interactive map visualization",
    ],
    icon: Target,
    id: "solution",
    title: "The Solution",
  },
  {
    bgColor: "bg-blue-500",
    color: "text-white",
    description:
      "Today, Metro Station Finder helps thousands of commuters navigate Dhaka's metro system with confidence, saving time and reducing the stress of urban transportation.",
    highlightText: "Metro Station Finder",
    highlights: [
      "1000+ active users",
      "17 metro stations covered",
      "Sub-100ms response times",
      "Zero maintenance overhead",
    ],
    icon: Users,
    id: "impact",
    title: "The Impact",
  },
];

const DescriptionWithHighlight = ({
  description,
  highlightText,
}: {
  description: string;
  highlightText?: string;
}) => {
  if (highlightText === undefined || !description.includes(highlightText)) {
    return <>{description}</>;
  }
  const parts = description.split(highlightText);
  return (
    <>
      {parts[0]}
      <span
        className="bg-clip-text font-semibold text-transparent"
        style={{
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          backgroundImage:
            "linear-gradient(135deg, var(--color-primary) 0%, oklch(from var(--color-primary) min(calc(l + 0.2), 0.95) c h) 50%, var(--color-primary) 100%)",
          color: "var(--color-primary)",
        }}
      >
        {highlightText}
      </span>
      {parts[1]}
    </>
  );
};

const StoryStepCard = memo(({ step, index }: { step: StoryStep; index: number }) => {
  const Icon = step.icon;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="transition-transform duration-300"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
      transition={{
        delay: index * 0.1,
        duration: ANIMATION_CONFIG.durations.fast,
        ease: ANIMATION_CONFIG.ease,
      }}
      viewport={{ amount: 0.2, once: true }}
      whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -4 }}
      whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
    >
      <div
        className={cn(
          "glass-card group relative h-full overflow-hidden rounded-2xl transition-all duration-300",
          "flex flex-col",
          "p-6 sm:p-8",
        )}
      >
        <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-transparent dark:from-primary/5 dark:via-transparent dark:to-primary/10 dark:opacity-50" />

        <div className="relative flex flex-1 flex-col">
          <div className="mb-6 flex items-center gap-4 sm:gap-6">
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-2xl p-3 shadow-lg transition-transform duration-300 sm:p-4",
                step.bgColor,
                "group-hover:scale-110",
              )}
            >
              <Icon className={cn("h-6 w-6 sm:h-8 sm:w-8", step.color)} />
            </div>
            <h3 className="font-bold text-foreground text-xl sm:text-2xl">{step.title}</h3>
          </div>

          <p className="mb-6 text-base text-muted-foreground leading-relaxed sm:text-base">
            <DescriptionWithHighlight
              description={step.description}
              {...(step.highlightText ? { highlightText: step.highlightText } : {})}
            />
          </p>

          <ul className="space-y-2.5">
            {step.highlights.map((highlight) => (
              <li className="flex items-start gap-3" key={highlight}>
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                <span className="text-muted-foreground text-sm leading-relaxed">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
});

StoryStepCard.displayName = "StoryStepCard";

export const StorySection = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <SectionWrapper id="story">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <motion.div
          className="mb-12 text-center sm:mb-16 lg:mb-20"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          transition={{
            duration: ANIMATION_CONFIG.durations.fast,
            ease: ANIMATION_CONFIG.ease,
          }}
          viewport={{ amount: 0.3, once: true }}
          whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
        >
          <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl lg:text-5xl">
            The Story Behind{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                backgroundImage:
                  "linear-gradient(135deg, var(--color-primary) 0%, oklch(from var(--color-primary) min(calc(l + 0.2), 0.95) c h) 50%, var(--color-primary) 100%)",
                color: "var(--color-primary)",
              }}
            >
              Metro Station Finder
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg">
            From a personal frustration to a solution that helps thousands of commuters navigate
            Dhaka's metro system with confidence.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2">
          {storySteps.map((step, index) => (
            <StoryStepCard index={index} key={step.id} step={step} />
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
});

StorySection.displayName = "StorySection";
