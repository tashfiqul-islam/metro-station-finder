"use client";

import { MapPin } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { memo, useRef } from "react";
import { ANIMATION_CONFIG } from "@/components/home/data/animation-config";
import { HERO_DATA } from "@/components/home/data/hero-data";
import { STATS_DATA } from "@/components/home/data/stats-data";
import { CTAButton } from "@/components/shared/buttons/cta-button";
import { StatCard } from "@/components/shared/cards/stat-card";
import { BackgroundGradients } from "@/components/shared/effects/background-gradients";

/**
 * Modern hero section with useTransition for smooth interactions
 */
export const HeroSection = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      className="relative flex min-h-[600px] items-center justify-center overflow-hidden"
      ref={ref}
      style={{
        minHeight: "calc(100svh - var(--header-height) - var(--footer-height))",
      }}
    >
      {/* Background gradients */}
      <BackgroundGradients />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 text-center sm:gap-10">
          {/* Badge */}
          <motion.div
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 font-semibold text-primary text-xs uppercase tracking-wider backdrop-blur-sm"
            style={{
              willChange: shouldReduceMotion ? "auto" : "transform, opacity",
            }}
            transition={{
              duration: ANIMATION_CONFIG.durations.fast,
              delay: 0.1,
              ease: ANIMATION_CONFIG.ease,
            }}
          >
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{HERO_DATA.badge}</span>
          </motion.div>

          {/* Heading */}
          <motion.div
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            className="max-w-4xl"
            style={{
              willChange: shouldReduceMotion ? "auto" : "transform, opacity",
            }}
            transition={{
              duration: ANIMATION_CONFIG.durations.slow,
              delay: 0.2,
              ease: ANIMATION_CONFIG.ease,
            }}
          >
            <h1 className="mb-6 font-extrabold text-4xl text-foreground tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {HERO_DATA.title}{" "}
              <span className="bg-linear-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                {HERO_DATA.titleHighlight}
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl">
              {HERO_DATA.description}
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            className="flex w-full max-w-md flex-col items-center gap-3 sm:flex-row sm:gap-4"
            style={{
              willChange: shouldReduceMotion ? "auto" : "transform, opacity",
            }}
            transition={{
              duration: ANIMATION_CONFIG.durations.fast,
              delay: 0.4,
              ease: ANIMATION_CONFIG.ease,
            }}
          >
            <CTAButton
              delay={0}
              href={HERO_DATA.cta.primary.href}
              icon={HERO_DATA.cta.primary.icon}
              variant="primary"
            >
              {HERO_DATA.cta.primary.text}
            </CTAButton>
            <CTAButton
              delay={ANIMATION_CONFIG.stagger}
              href={HERO_DATA.cta.secondary.href}
              icon={HERO_DATA.cta.secondary.icon}
              variant="secondary"
            >
              {HERO_DATA.cta.secondary.text}
            </CTAButton>
          </motion.div>

          {/* Stats */}
          <motion.div
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            className="w-full max-w-4xl pt-12"
            style={{
              willChange: shouldReduceMotion ? "auto" : "transform, opacity",
            }}
            transition={{
              duration: ANIMATION_CONFIG.durations.normal,
              delay: 0.5,
              ease: ANIMATION_CONFIG.ease,
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              {STATS_DATA.map((stat, index) => (
                <StatCard key={stat.label} {...stat} index={index} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = "HeroSection";
