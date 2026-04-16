import { Link } from "@tanstack/react-router";
import { Calculator, MapPin, NavigationArrow } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { memo } from "react";

import { SectionWrapper } from "@/components/common/section-wrapper";
import AnimatedBadge from "@/components/ui/animated-badge";
import { ANIMATION_CONFIG } from "@/components/ui/animation-constants";
import { Button } from "@/components/ui/button";
import { HERO_DATA } from "@/lib/constants/hero-data";

export const HeroSection = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = true;

  return (
    <SectionWrapper id="hero" snapAlign="start">
      <div
        className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 sm:px-6 lg:px-8"
        style={{
          minHeight: "100dvh",
          paddingBottom: "var(--header-height)",
          paddingTop: "calc(var(--header-height) - 4rem)",
        }}
      >
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            animate={shouldAnimate ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            className="mb-6 sm:mb-8"
            style={{ willChange: shouldReduceMotion ? "auto" : "transform, opacity" }}
            transition={{
              delay: 0.1,
              duration: ANIMATION_CONFIG.durations.fast,
              ease: ANIMATION_CONFIG.ease,
            }}
          >
            <AnimatedBadge
              color="var(--color-primary)"
              href="/station-finder"
              text="Introducing v1.0.0"
            />
          </motion.div>

          <motion.h1
            animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            className="mb-6 font-extrabold text-4xl text-foreground tracking-tight sm:mb-8 sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
            style={{ willChange: shouldReduceMotion ? "auto" : "transform, opacity" }}
            transition={{
              delay: 0.2,
              duration: ANIMATION_CONFIG.durations.slow,
              ease: ANIMATION_CONFIG.ease,
            }}
          >
            Navigate Dhaka's Metro Stations with{" "}
            <span
              className="bg-clip-text font-extrabold text-transparent"
              style={{
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                backgroundImage:
                  "linear-gradient(135deg, var(--color-primary) 0%, oklch(from var(--color-primary) min(calc(l + 0.2), 0.95) c h) 50%, var(--color-primary) 100%)",
                color: "var(--color-primary)",
              }}
            >
              Precision
            </span>
          </motion.h1>

          <motion.p
            animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            className="mx-auto mb-12 max-w-3xl text-lg text-muted-foreground leading-relaxed sm:mb-16 sm:text-xl lg:text-2xl"
            style={{ willChange: shouldReduceMotion ? "auto" : "transform, opacity" }}
            transition={{
              delay: 0.3,
              duration: ANIMATION_CONFIG.durations.slow,
              ease: ANIMATION_CONFIG.ease,
            }}
          >
            Find stations, calculate fares, and plan your journey across Dhaka's metro station
            network—fast, accurate, and completely free.
          </motion.p>

          <motion.div
            animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            className="mb-12 flex flex-col items-center gap-4 sm:mb-16 sm:flex-row sm:justify-center"
            style={{ willChange: shouldReduceMotion ? "auto" : "transform, opacity" }}
            transition={{
              delay: 0.5,
              duration: ANIMATION_CONFIG.durations.fast,
              ease: ANIMATION_CONFIG.ease,
            }}
          >
            <Button
              asChild={
                <Link to={HERO_DATA.cta.primary.href as string}>
                  <HERO_DATA.cta.primary.icon />
                  {HERO_DATA.cta.primary.text}
                </Link>
              }
              className="w-full sm:w-auto"
              size="lg"
              variant="primary"
            />
            <Button
              asChild={
                <Link to={HERO_DATA.cta.secondary.href as string}>
                  <HERO_DATA.cta.secondary.icon />
                  {HERO_DATA.cta.secondary.text}
                </Link>
              }
              className="w-full border-primary bg-background text-primary hover:bg-primary/10 hover:text-primary sm:w-auto dark:border-primary dark:text-primary dark:hover:bg-primary/10"
              size="lg"
              variant="outline"
            />
          </motion.div>

          <motion.div
            animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            className="relative mx-auto max-w-4xl px-4 sm:px-0"
            style={{ willChange: shouldReduceMotion ? "auto" : "transform, opacity" }}
            transition={{
              delay: 0.6,
              duration: ANIMATION_CONFIG.durations.slow,
              ease: ANIMATION_CONFIG.ease,
            }}
          >
            <div className="glass-card relative overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-transparent dark:from-primary/5 dark:via-transparent dark:to-primary/10 dark:opacity-50" />

              <div className="relative p-6 sm:p-8">
                <div className="mb-6 flex items-center gap-4">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div className="ml-4 font-medium text-foreground text-sm">
                    Metro Station Finder
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="glass-card group flex h-12 w-full items-center rounded-lg px-4 transition-all duration-300 hover:border-white/25 hover:shadow-lg dark:hover:border-white/20 dark:hover:bg-white/10">
                    <MapPin className="mr-3 h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:text-primary" />
                    <span className="text-muted-foreground transition-all duration-300 group-hover:text-primary">
                      Search for a station...
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="glass-card group rounded-lg p-4 transition-all duration-300 hover:border-white/25 hover:shadow-lg dark:hover:border-white/20 dark:hover:bg-white/10">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-card shadow-md transition-all duration-300 group-hover:border-primary/50 group-hover:bg-primary/25 dark:border-white/20 dark:bg-white/10 dark:shadow-lg">
                          <NavigationArrow className="h-4 w-4 text-foreground transition-all duration-300 group-hover:text-primary" />
                        </div>
                        <div className="flex min-w-0 flex-col text-left">
                          <div className="font-semibold text-foreground transition-all duration-300 group-hover:text-primary">
                            Station Finder
                          </div>
                          <div className="text-muted-foreground text-sm transition-all duration-300 group-hover:text-primary">
                            Find nearest stations
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card group rounded-lg p-4 transition-all duration-300 hover:border-white/25 hover:shadow-lg dark:hover:border-white/20 dark:hover:bg-white/10">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-card shadow-md transition-all duration-300 group-hover:border-primary/50 group-hover:bg-primary/25 dark:border-white/20 dark:bg-white/10 dark:shadow-lg">
                          <Calculator className="h-4 w-4 text-foreground transition-all duration-300 group-hover:text-primary" />
                        </div>
                        <div className="flex min-w-0 flex-col text-left">
                          <div className="font-semibold text-foreground transition-all duration-300 group-hover:text-primary">
                            Fare Calculator
                          </div>
                          <div className="text-muted-foreground text-sm transition-all duration-300 group-hover:text-primary">
                            Calculate journey cost
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  );
});

HeroSection.displayName = "HeroSection";
