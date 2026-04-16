import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowSquareOut,
  Briefcase,
  GraduationCap,
  MapPin,
} from "@phosphor-icons/react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { memo, useRef } from "react";

import { SectionWrapper } from "@/components/common/section-wrapper";
import { ANIMATION_CONFIG } from "@/components/ui/animation-constants";

interface SocialLinkData {
  href: string;
  label: string;
  iconPath: string;
}

const socialLinks: SocialLinkData[] = [
  {
    href: "https://www.linkedin.com/in/tashfiqulislam/",
    iconPath: "/socials/linkedin.svg",
    label: "LinkedIn",
  },
  {
    href: "https://www.instagram.com/_tashfiqulislam/",
    iconPath: "/socials/instagram.svg",
    label: "Instagram",
  },
  {
    href: "mailto:tashfiq61@gmail.com",
    iconPath: "/socials/gmail.svg",
    label: "Gmail",
  },
];

const keyInfo = [
  { icon: Briefcase, label: "Role", value: "Product Manager @ Field Nation" },
  { icon: GraduationCap, label: "Education", value: "CSE, NSU" },
  { icon: MapPin, label: "Location", value: "Dhaka, Bangladesh" },
];

const SocialLink = memo(({ href, label, iconPath, index }: SocialLinkData & { index: number }) => {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const isInView = useInView(ref, { margin: "-50px", once: true });

  return (
    <motion.a
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      className="glass-card group relative flex items-center justify-center rounded-xl p-3 transition-all duration-300 hover:border-primary/40 hover:shadow-lg"
      href={href}
      initial={{ opacity: 0, scale: 0.8 }}
      ref={ref}
      rel="noopener noreferrer"
      target="_blank"
      transition={{
        delay: index * 0.1,
        duration: shouldReduceMotion
          ? ANIMATION_CONFIG.durations.fast
          : ANIMATION_CONFIG.durations.normal,
        ease: ANIMATION_CONFIG.ease,
      }}
      whileHover={shouldReduceMotion ? {} : { scale: 1.1, y: -2 }}
    >
      <img
        alt={label}
        className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 sm:h-6 sm:w-6"
        height={24}
        src={iconPath}
        width={24}
      />
    </motion.a>
  );
});

SocialLink.displayName = "SocialLink";

export const MaintainerSection = memo((): React.ReactElement => {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-100px", once: true });

  return (
    <SectionWrapper id="maintainer">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          className="mb-12 text-center sm:mb-16 lg:mb-20"
          initial={{ opacity: 0, y: 20 }}
          ref={ref}
          style={{ willChange: shouldReduceMotion ? "auto" : "transform, opacity" }}
          transition={{
            duration: shouldReduceMotion
              ? ANIMATION_CONFIG.durations.fast
              : ANIMATION_CONFIG.durations.slow,
            ease: ANIMATION_CONFIG.ease,
          }}
        >
          <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl lg:text-5xl xl:text-6xl">
            Meet the{" "}
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
              Maintainer
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg lg:text-xl">
            The vibe coder behind Metro Station Finder. Crafting magical solutions for real-world
            problems.
          </p>
        </motion.div>

        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Profile Card */}
            <motion.div
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
              className="relative flex h-full"
              initial={{ opacity: 0, x: -30 }}
              style={{ willChange: shouldReduceMotion ? "auto" : "transform, opacity" }}
              transition={{
                delay: 0.2,
                duration: shouldReduceMotion
                  ? ANIMATION_CONFIG.durations.fast
                  : ANIMATION_CONFIG.durations.slow,
                ease: ANIMATION_CONFIG.ease,
              }}
            >
              <div className="glass-card relative flex h-full w-full flex-col items-center overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-2xl sm:p-8">
                <div className="group relative mb-6 flex justify-center">
                  <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-primary/20 via-primary/30 to-primary/20 opacity-75 blur-2xl transition-opacity duration-300 group-hover:opacity-100 sm:rounded-4xl" />
                  <div className="relative h-20 w-20 overflow-hidden rounded-3xl border-2 border-primary/40 shadow-xl ring-2 ring-primary/10 transition-transform duration-300 group-hover:scale-105 sm:h-28 sm:w-28 sm:rounded-4xl dark:border-primary/50 dark:ring-primary/20">
                    <div className="absolute inset-0 rounded-3xl bg-linear-to-br from-primary/5 via-transparent to-primary/10 sm:rounded-4xl" />
                    <img
                      alt="Tashfiqul Islam"
                      className="h-full w-full object-cover object-center"
                      height={112}
                      src="/tashfiq.png"
                      width={112}
                    />
                  </div>
                </div>

                <div className="mb-6 flex flex-col items-center text-center">
                  <h3 className="mb-2 font-bold text-foreground text-xl sm:text-2xl">
                    Tashfiqul Islam
                  </h3>
                  <p className="mb-4 font-medium text-muted-foreground text-sm sm:text-base">
                    Product Manager
                  </p>
                  <p className="mx-auto max-w-sm text-muted-foreground text-xs leading-relaxed sm:text-sm">
                    Product leader by day, vibe coder by night. Passionate about building innovative
                    solutions.
                  </p>
                </div>

                <div className="mt-auto flex justify-center gap-3">
                  {socialLinks.map((link, index) => (
                    <SocialLink key={link.label} {...link} index={index} />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Info Cards + CTAs */}
            <motion.div
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
              className="flex h-full flex-col gap-6"
              initial={{ opacity: 0, x: 30 }}
              style={{ willChange: shouldReduceMotion ? "auto" : "transform, opacity" }}
              transition={{
                delay: 0.3,
                duration: shouldReduceMotion
                  ? ANIMATION_CONFIG.durations.fast
                  : ANIMATION_CONFIG.durations.slow,
                ease: ANIMATION_CONFIG.ease,
              }}
            >
              {keyInfo.map((info, index) => {
                const Icon = info.icon;
                return (
                  <motion.div
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    className="flex h-24 w-full"
                    initial={{ opacity: 0, y: 20 }}
                    key={info.label}
                    style={{ willChange: shouldReduceMotion ? "auto" : "transform, opacity" }}
                    transition={{
                      delay: 0.4 + index * 0.1,
                      duration: shouldReduceMotion
                        ? ANIMATION_CONFIG.durations.fast
                        : ANIMATION_CONFIG.durations.normal,
                      ease: ANIMATION_CONFIG.ease,
                    }}
                  >
                    <div className="glass-card group relative flex h-full w-full items-center overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-xl">
                      <div className="flex w-full items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-lg transition-transform duration-300 group-hover:scale-110 dark:bg-primary/20">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            {info.label}
                          </p>
                          <p className="font-bold text-foreground text-lg">{info.value}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              <motion.div
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                className="mt-auto flex flex-col gap-4 sm:flex-row"
                initial={{ opacity: 0, y: 20 }}
                style={{ willChange: shouldReduceMotion ? "auto" : "transform, opacity" }}
                transition={{
                  delay: 0.7,
                  duration: shouldReduceMotion
                    ? ANIMATION_CONFIG.durations.fast
                    : ANIMATION_CONFIG.durations.normal,
                  ease: ANIMATION_CONFIG.ease,
                }}
              >
                <a
                  className="glass-card group flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium text-foreground text-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg sm:px-7 sm:py-3.5 sm:text-base"
                  href="https://github.com/tashfiqul-islam"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <img
                    alt="GitHub"
                    className="h-4 w-4 sm:h-5 sm:w-5 dark:hidden"
                    height={20}
                    src="/socials/GitHub_light.svg"
                    width={20}
                  />
                  <img
                    alt="GitHub"
                    className="hidden h-4 w-4 sm:h-5 sm:w-5 dark:block"
                    height={20}
                    src="/socials/GitHub_dark.svg"
                    width={20}
                  />
                  <span>GitHub</span>
                  <ArrowSquareOut className="h-3 w-3 sm:h-4 sm:w-4" />
                </a>
                <Link
                  className="group flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary px-6 py-3 font-medium text-primary-foreground text-sm shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-primary/90 hover:shadow-lg sm:px-7 sm:py-3.5 sm:text-base dark:border-primary dark:bg-primary/80 dark:hover:border-primary dark:hover:bg-primary/70"
                  to={"/station-finder" as string}
                >
                  <span>Try the App</span>
                  <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1 sm:h-4 sm:w-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
});

MaintainerSection.displayName = "MaintainerSection";
