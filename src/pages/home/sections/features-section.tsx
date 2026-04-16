import {
  ClockIcon,
  CodeIcon,
  DeviceMobileIcon,
  GlobeIcon,
  Lightning,
  MapPinIcon,
  NavigationArrowIcon,
  RocketIcon,
  StarIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { memo } from "react";

import { SectionWrapper } from "@/components/common/section-wrapper";
import { ANIMATION_CONFIG } from "@/components/ui/animation-constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  badge?: string;
  featured?: boolean;
  stats: string;
  statsIcon: React.ComponentType<{ className?: string }>;
}

const features: Feature[] = [
  {
    badge: "Core Feature",
    description:
      "Lightning-fast station discovery with AI-powered suggestions and predictive search capabilities.",
    featured: true,
    icon: Lightning,
    iconBg: "bg-linear-to-r from-primary to-primary/80",
    id: "real-time-search",
    stats: "<100ms response",
    statsIcon: ClockIcon,
    title: "Real-time Search",
  },
  {
    description:
      "MapLibre + OpenFreeMap tiles + OpenRouteService walking routes with custom markers and real-time updates.",
    icon: MapPinIcon,
    iconBg: "bg-linear-to-r from-teal-600 to-teal-500 dark:from-teal-500 dark:to-teal-400",
    id: "interactive-maps",
    stats: "17 stations",
    statsIcon: NavigationArrowIcon,
    title: "Interactive Maps",
  },
  {
    description: "Accurate fare calculation between any two metro stations with dynamic pricing.",
    icon: CodeIcon,
    iconBg: "bg-linear-to-r from-green-500 to-emerald-500",
    id: "fare-calculation",
    stats: "100% accurate",
    statsIcon: CodeIcon,
    title: "Smart Fare Calculation",
  },
  {
    description:
      "Works seamlessly underground with advanced caching and progressive web app capabilities.",
    icon: GlobeIcon,
    iconBg: "bg-linear-to-r from-purple-500 to-violet-500",
    id: "offline-support",
    stats: "100% offline",
    statsIcon: GlobeIcon,
    title: "Offline Support",
  },
  {
    description:
      "Optimized for mobile commuters with touch-friendly interfaces and gesture navigation.",
    icon: DeviceMobileIcon,
    iconBg: "bg-linear-to-r from-pink-500 to-rose-500",
    id: "mobile-first",
    stats: "Touch optimized",
    statsIcon: DeviceMobileIcon,
    title: "Mobile First",
  },
];

interface Stat {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

const stats: Stat[] = [
  { icon: NavigationArrowIcon, label: "Stations", value: "17" },
  { icon: RocketIcon, label: "Response Time", value: "<100ms" },
  { icon: UsersIcon, label: "Users", value: "1000+" },
];

export const FeaturesSection = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <SectionWrapper id="features">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
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
            Features <span className="gradient-text font-extrabold">That Matter</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg lg:text-xl">
            Every feature is designed with the commuter in mind, ensuring reliability and ease of
            use.
          </p>
        </motion.div>

        <motion.div
          className="mb-16 flex flex-wrap justify-center gap-4 sm:mb-20 lg:mb-24"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          transition={{
            delay: 0.2,
            duration: ANIMATION_CONFIG.durations.fast,
            ease: ANIMATION_CONFIG.ease,
          }}
          viewport={{ amount: 0.2, once: true }}
          whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                className="group relative w-full flex-1 basis-[calc(50%-0.5rem)] sm:w-auto sm:basis-auto"
                initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                key={stat.label}
                transition={{
                  delay: index * 0.1,
                  duration: ANIMATION_CONFIG.durations.fast,
                  ease: ANIMATION_CONFIG.ease,
                }}
                viewport={{ amount: 0.2, once: true }}
                whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                whileInView={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
              >
                <div className="glass-card group relative h-full overflow-hidden rounded-2xl transition-all duration-300">
                  <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-transparent dark:from-primary/5 dark:via-transparent dark:to-primary/10 dark:opacity-50" />
                  <div className="relative flex items-center gap-3 px-5 py-3 sm:gap-4 sm:px-6 sm:py-4">
                    <div className="flex shrink-0 items-center justify-center rounded-lg p-2 shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-xl sm:text-2xl">
                        {stat.value}
                      </div>
                      <div className="font-medium text-muted-foreground text-xs sm:text-sm">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const StatsIcon = feature.statsIcon;

            return (
              <motion.div
                className={cn(
                  "glass-card group relative overflow-hidden rounded-2xl transition-all duration-300",
                  feature.featured && "sm:col-span-2 lg:col-span-2",
                )}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
                key={feature.id}
                transition={{
                  delay: index * 0.1,
                  duration: ANIMATION_CONFIG.durations.fast,
                  ease: ANIMATION_CONFIG.ease,
                }}
                viewport={{ amount: 0.2, once: true }}
                whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -4 }}
                whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              >
                <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-transparent dark:from-primary/5 dark:via-transparent dark:to-primary/10 dark:opacity-50" />

                <div className="relative flex h-full flex-col p-6 sm:p-8">
                  <div className="mb-4 flex items-start gap-4">
                    <div
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded-xl p-3 shadow-lg transition-transform duration-300 group-hover:scale-110 sm:p-4",
                        feature.iconBg,
                      )}
                    >
                      <Icon className="h-6 w-6 text-white sm:h-7 sm:w-7" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="font-bold text-foreground text-lg sm:text-xl">
                          {feature.title}
                        </h3>
                        {feature.badge && (
                          <Badge className="bg-primary/20 text-primary" variant="secondary">
                            {feature.badge}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="mb-6 flex-1 text-muted-foreground text-sm leading-relaxed sm:text-base">
                    {feature.description}
                  </p>

                  <div className="flex items-center justify-between border-border/50 border-t pt-4 dark:border-border/30">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <StatsIcon className="h-4 w-4" />
                      <span className="font-medium">{feature.stats}</span>
                    </div>
                    {feature.featured && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <StarIcon
                            className="h-4 w-4 fill-yellow-400 text-yellow-400"
                            key={`star-${feature.id}-${i + 1}`}
                            weight="fill"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
});

FeaturesSection.displayName = "FeaturesSection";
