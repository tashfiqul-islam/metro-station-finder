import {
  CurrencyCircleDollarIcon,
  GithubLogoIcon,
  MapTrifoldIcon,
  NavigationArrowIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Button } from "@/components/ui/button";

const TECH_ITEMS = [
  "React 19",
  "TypeScript",
  "TanStack Start",
  "Tailwind v4",
  "shadcn/ui",
  "Vite + Rolldown",
  "Vitest",
  "Bun",
  "MapLibre GL",
  "Phosphor Icons",
] as const;

const FEATURES = [
  {
    description:
      "Locate any of the 17 MRT Line 6 stations by name — with exit details and connecting landmarks.",
    icon: NavigationArrowIcon,
    title: "Station Finder",
  },
  {
    description:
      "Calculate exact fares for single, return, and MRT Pass trips — no hunting through outdated PDFs.",
    icon: CurrencyCircleDollarIcon,
    title: "Fare Calculator",
  },
  {
    description:
      "Plan trips across the full 20.1 km network with station-by-station route breakdowns.",
    icon: MapTrifoldIcon,
    title: "Trip Planner",
  },
] as const;

const SectionEyebrow = ({ label }: { label: string }) => (
  <div className="mb-4 flex items-center justify-center gap-3">
    <div aria-hidden className="h-px w-8 bg-primary/50" />
    <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">{label}</span>
    <div aria-hidden className="h-px w-8 bg-primary/50" />
  </div>
);

const GradientHeading = ({ children }: { children: React.ReactNode }) => (
  <h2
    className="font-sans text-3xl font-bold lg:text-4xl"
    style={{
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      background:
        "linear-gradient(135deg, oklch(0.52 0.12 145), oklch(0.72 0.18 145) 45%, oklch(0.58 0.22 145))",
      backgroundClip: "text",
    }}
  >
    {children}
  </h2>
);

export const About = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div suppressHydrationWarning>
      {/* ── Page header ── */}
      <section className="relative overflow-x-clip pb-16 pt-28 lg:pt-32">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <motion.div
            className="absolute left-1/2 top-0 h-[55vh] w-[110vw] -translate-x-1/2 -translate-y-[35%] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse 65% 55% at 50% 0%, oklch(0.64 0.2 145 / 0.18) 0%, oklch(0.64 0.2 145 / 0.05) 52%, transparent 74%)",
            }}
            animate={shouldReduceMotion ? {} : { opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
          />
          <div
            className="absolute inset-0 opacity-[0.022]"
            style={{
              backgroundImage:
                "linear-gradient(oklch(0.85 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0 0) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>
        <div className="container mx-auto px-4 text-center">
          <ViewportAnimation delay={0}>
            <div className="mb-4 inline-flex items-center gap-3">
              <div aria-hidden className="h-px w-8 bg-primary/50" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
                The Project
              </span>
              <div aria-hidden className="h-px w-8 bg-primary/50" />
            </div>
          </ViewportAnimation>
          <ViewportAnimation delay={0.07}>
            <h1 className="font-sans text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              About
            </h1>
          </ViewportAnimation>
          <ViewportAnimation delay={0.14}>
            <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground/80">
              The story behind metro-station-finder.
            </p>
          </ViewportAnimation>
        </div>
      </section>

      {/* ── Overview ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <ViewportAnimation>
            <div className="mx-auto max-w-3xl text-center">
              <SectionEyebrow label="Overview" />
              <GradientHeading>Bangladesh&apos;s first MRT guide</GradientHeading>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
                metro-station-finder is a purpose-built tool for navigating Dhaka&apos;s MRT Line 6
                — Bangladesh&apos;s first metro rail system. It provides station information, fare
                calculations, and trip planning for all 17 stations across the 20.1&nbsp;km network.
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Built with modern web technologies, it aims to be the most reliable and
                user-friendly MRT reference for Dhaka commuters.
              </p>
            </div>
          </ViewportAnimation>
        </div>
      </section>

      {/* ── Mission pull-quote ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <ViewportAnimation>
            <div className="mx-auto max-w-3xl text-center">
              <SectionEyebrow label="Mission" />
              <blockquote
                className="mt-2 font-sans text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl"
                style={{
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  background:
                    "linear-gradient(135deg, oklch(0.82 0.06 145), oklch(0.90 0.04 145) 50%, oklch(0.80 0.08 70))",
                  backgroundClip: "text",
                }}
              >
                &ldquo;Every commuter deserves to know their fare before they board and their route
                before they travel.&rdquo;
              </blockquote>
              <p className="mt-6 text-sm text-muted-foreground/70">
                This project is open source and community-driven. Contributions, corrections, and
                feedback are always welcome.
              </p>
            </div>
          </ViewportAnimation>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <ViewportAnimation>
            <div className="mb-12 text-center">
              <SectionEyebrow label="What It Does" />
              <GradientHeading>Built for Dhaka commuters</GradientHeading>
            </div>
          </ViewportAnimation>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
            {FEATURES.map(({ description, icon: Icon, title }, i) => (
              <ViewportAnimation delay={i * 0.08} key={title}>
                <div className="group flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_40px_oklch(0.64_0.2_145_/_0.12)]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                    <Icon aria-hidden className="h-5 w-5 text-primary" weight="duotone" />
                  </div>
                  <div>
                    <div className="font-sans text-base font-semibold text-foreground">{title}</div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              </ViewportAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <ViewportAnimation>
            <div className="mx-auto max-w-md rounded-2xl border border-border/25 bg-card/20 px-2 py-5 text-center backdrop-blur-md">
              <div className="flex items-center divide-x divide-border/40">
                {(
                  [
                    { label: "Stations", value: "17" },
                    { label: "Route Length", value: "20.1 km" },
                    { label: "MRT Network", value: "Line 6" },
                  ] as const
                ).map(({ label, value }) => (
                  <div key={label} className="flex-1 px-4 text-center">
                    <div className="text-2xl font-extrabold leading-none text-foreground">
                      {value}
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </ViewportAnimation>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <ViewportAnimation>
            <div className="mb-12 text-center">
              <SectionEyebrow label="Built With" />
              <GradientHeading>Tech Stack</GradientHeading>
            </div>
          </ViewportAnimation>
          <ViewportAnimation delay={0.08}>
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {TECH_ITEMS.map((tech) => (
                <div
                  key={tech}
                  className="flex items-center justify-center rounded-xl border border-border/40 px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/30 hover:text-foreground"
                >
                  {tech}
                </div>
              ))}
            </div>
          </ViewportAnimation>
        </div>
      </section>

      {/* ── Contact / open source ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <ViewportAnimation>
            <div className="mx-auto max-w-lg rounded-2xl border border-border/40 bg-card/30 p-8 text-center backdrop-blur-sm">
              <SectionEyebrow label="Get Involved" />
              <h2 className="font-sans text-2xl font-bold text-foreground">Contact</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Have a suggestion or found a data issue? Reach out via GitHub — issues and PRs are
                always welcome.
              </p>
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  className="gap-2 font-semibold transition-all duration-300 hover:border-primary/50 hover:bg-primary/5"
                  asChild={
                    <a
                      href="https://github.com/tashfiqul-islam/metro-station-finder"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <GithubLogoIcon aria-hidden className="h-4 w-4" />
                      Open an Issue
                    </a>
                  }
                />
              </div>
            </div>
          </ViewportAnimation>
        </div>
      </section>
    </div>
  );
};

export const Route = createFileRoute("/about")({
  component: About,
});
