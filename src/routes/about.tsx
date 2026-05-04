import {
  GithubLogoIcon,
  GraduationCapIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  MusicNotesSimpleIcon,
  ReadCvLogoIcon,
  RedditLogoIcon,
  SparkleIcon,
  SuitcaseSimpleIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Button } from "@/components/ui/button";
import { generateHeadConfig } from "@/lib/head-meta";

const PROJECT_VALUES = [
  {
    description:
      "The product starts from commuter decisions: the right stop, the right fare, and the right stretch of line.",
    title: "Useful first",
  },
  {
    description:
      "It stays fast, static, and simple enough to trust under real-world mobile conditions.",
    title: "Reliable by default",
  },
  {
    description:
      "Everything is open, inspectable, and built so future improvements can stay practical instead of bloated.",
    title: "Open source on purpose",
  },
] as const;

const SOCIALS = [
  {
    href: "https://www.linkedin.com/in/tashfiqulislam/",
    icon: LinkedinLogoIcon,
    label: "LinkedIn",
  },
  {
    href: "https://www.instagram.com/_tashfiqulislam/",
    icon: InstagramLogoIcon,
    label: "Instagram",
  },
  {
    href: "https://www.reddit.com/user/DeadShotss/",
    icon: RedditLogoIcon,
    label: "Reddit",
  },
  {
    href: "https://github.com/tashfiqul-islam/metro-station-finder",
    icon: GithubLogoIcon,
    label: "GitHub",
  },
] as const;

const OTHER_PROJECTS = [
  {
    href: "https://github.com/tashfiqul-islam/profile-view-counter",
    label: "Profile View Counter",
  },
  {
    href: "https://github.com/tashfiqul-islam/profile-weather-view",
    label: "Profile Weather View",
  },
] as const;

const NOW_BUILDING = [
  "AI chat bot",
  "Agent orchestration behavior patterns",
  "Automation tools for daily use cases",
] as const;

const MUSIC = [
  "Queen",
  "Linkin Park",
  "Imagine Dragons",
  "Evanescence",
  "Led Zeppelin",
  "Bullet for My Valentine",
  "Skillet",
  "Pink Floyd",
  "Guns N' Roses",
  "Michael Jackson",
  "Papa Roach",
] as const;

const About = () => (
  <div suppressHydrationWarning>
    <section className="relative overflow-x-clip pb-18 pt-28 lg:pt-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute left-1/2 top-0 h-[55vh] w-[110vw] -translate-x-1/2 translate-y-[-35%] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 50% 0%, oklch(0.64 0.2 145 / 0.18) 0%, oklch(0.64 0.2 145 / 0.05) 52%, transparent 74%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.022]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.52 0.02 145 / 0.14) 1px, transparent 1px), linear-gradient(90deg, oklch(0.52 0.02 145 / 0.14) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-end lg:gap-14">
          <ViewportAnimation>
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div aria-hidden className="h-px w-8 bg-primary/50" />
                <span className="section-kicker">The project</span>
              </div>

              <h1 className="font-sans text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Built for Dhaka commuters,
                <span className="block gradient-text">
                  shaped by a product owner who ships tools
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                metro-station-finder began as a response to a simple transit problem: too much MRT
                information was scattered, unofficial, or slow to check at the exact moment people
                needed certainty.
              </p>
            </div>
          </ViewportAnimation>

          <ViewportAnimation delay={0.08}>
            <div className="section-panel p-6 lg:p-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                Why it matters
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Dhaka commuters already think fast in motion. This tool exists so the interface can
                do the same: answer the immediate question, remove avoidable doubt, and let the
                rider move on with confidence.
              </p>
            </div>
          </ViewportAnimation>
        </div>
      </div>
    </section>

    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <ViewportAnimation>
            <div className="max-w-xl">
              <div className="mb-4 flex items-center gap-3">
                <div aria-hidden className="h-px w-8 bg-primary/50" />
                <span className="section-kicker">The maintainer</span>
              </div>

              <h2
                className="font-heading text-3xl font-bold tracking-tight lg:text-4xl"
                style={{
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  background:
                    "linear-gradient(135deg, oklch(0.52 0.12 145), oklch(0.72 0.18 145) 45%, oklch(0.58 0.22 145))",
                  backgroundClip: "text",
                }}
              >
                Tashfiqul Islam
              </h2>

              <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
                Tashfiq is a Product Owner at Field Nation who likes building software that feels
                practical the moment it is opened. Outside work, he ships open-source tools,
                experiments with AI systems and orchestration patterns, and keeps returning to one
                idea: software should reduce friction, not add more of it. He studied Computer
                Science and Engineering at North South University and still approaches projects like
                a builder first.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-2.5">
                {SOCIALS.map(({ href, icon: Icon, label }) => (
                  <a
                    className="section-chip inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    href={href}
                    key={label}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Icon aria-hidden className="h-4 w-4 text-primary/80" weight="duotone" />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </ViewportAnimation>

          <ViewportAnimation delay={0.08}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="section-card rounded-[1.75rem] p-6">
                <div className="flex items-center gap-3 text-primary/80">
                  <SuitcaseSimpleIcon className="h-5 w-5" weight="duotone" />
                  <span className="section-kicker">Work</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Product Owner at Field Nation, with a strong bias toward shipping useful tools and
                  making messy workflows feel obvious.
                </p>
              </div>

              <div className="section-card rounded-[1.75rem] p-6">
                <div className="flex items-center gap-3 text-primary/80">
                  <GraduationCapIcon className="h-5 w-5" weight="duotone" />
                  <span className="section-kicker">Background</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Studied Computer Science and Engineering at North South University, then kept
                  learning through OSS, product work, and side projects.
                </p>
              </div>

              <div className="section-card rounded-[1.75rem] p-6">
                <div className="flex items-center gap-3 text-primary/80">
                  <WrenchIcon className="h-5 w-5" weight="duotone" />
                  <span className="section-kicker">Building now</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-muted-foreground">
                  {NOW_BUILDING.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="section-card rounded-[1.75rem] p-6">
                <div className="flex items-center gap-3 text-primary/80">
                  <MusicNotesSimpleIcon className="h-5 w-5" weight="duotone" />
                  <span className="section-kicker">Coding soundtrack</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {MUSIC.map((artist) => (
                    <span
                      className="section-chip px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
                      key={artist}
                    >
                      {artist}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </ViewportAnimation>
        </div>
      </div>
    </section>

    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <ViewportAnimation>
            <div className="max-w-xl">
              <div className="mb-4 flex items-center gap-3">
                <div aria-hidden className="h-px w-8 bg-primary/50" />
                <span className="section-kicker">Operating principles</span>
              </div>

              <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                The product is narrow because the rider&apos;s question is usually narrow.
              </h2>

              <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
                Good transit tools do not need to explain everything. They need to answer the next
                question clearly, quickly, and without making the rider work harder than the route
                already does.
              </p>

              <div className="section-panel mt-8 p-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                  Product intent
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Every feature is pushed toward the same standard: fewer taps, less guesswork, and
                  a calmer decision before the commute continues.
                </p>
              </div>
            </div>
          </ViewportAnimation>

          <div className="grid gap-4 lg:gap-5">
            {PROJECT_VALUES.map(({ description, title }, index) => (
              <ViewportAnimation delay={index * 0.08} key={title}>
                <div className="section-card grid gap-4 rounded-[1.75rem] p-6 sm:grid-cols-[auto_1fr] sm:items-start">
                  <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/18 bg-primary/8">
                      <SparkleIcon className="h-5 w-5 text-primary/85" weight="duotone" />
                    </div>
                    <span className="section-kicker">0{index + 1}</span>
                  </div>

                  <div>
                    <h3 className="font-heading text-xl font-bold tracking-tight text-foreground">
                      {title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
                  </div>
                </div>
              </ViewportAnimation>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <ViewportAnimation>
            <div className="max-w-xl">
              <div className="mb-4 flex items-center gap-3">
                <div aria-hidden className="h-px w-8 bg-primary/50" />
                <span className="section-kicker">Open source work</span>
              </div>

              <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
                More tools from the same builder
              </h2>

              <p className="mt-5 text-base leading-8 text-muted-foreground">
                Metro Station Finder is one of several small tools built around useful, repeatable,
                practical workflows.
              </p>
            </div>
          </ViewportAnimation>

          <ViewportAnimation delay={0.08}>
            <div className="grid gap-4 lg:gap-5">
              {OTHER_PROJECTS.map(({ href, label }) => (
                <a
                  className="section-card group flex items-center justify-between rounded-[1.5rem] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/28 hover:shadow-[0_24px_70px_oklch(0_0_0/0.10)]"
                  href={href}
                  key={label}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                      OSS tool
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                      {label}
                    </div>
                  </div>

                  <ReadCvLogoIcon
                    className="h-5 w-5 text-primary/80 transition-transform duration-200 group-hover:translate-x-0.5"
                    weight="duotone"
                  />
                </a>
              ))}
            </div>
          </ViewportAnimation>
        </div>
      </div>
    </section>

    <section className="py-20">
      <div className="container mx-auto px-4">
        <ViewportAnimation>
          <div className="section-panel mx-auto max-w-3xl p-8 text-center sm:p-10">
            <div className="mb-4 flex items-center justify-center gap-3">
              <div aria-hidden className="h-px w-8 bg-primary/50" />
              <span className="section-kicker">Contribute</span>
              <div aria-hidden className="h-px w-8 bg-primary/50" />
            </div>

            <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Found a gap? Open an issue.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              Corrections, route ideas, and transit data improvements are all welcome. The easiest
              way to help is still the best one: open a GitHub issue and describe what should be
              better.
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild={
                  <a
                    href="https://github.com/tashfiqul-islam/metro-station-finder/issues"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Open an Issue
                  </a>
                }
                className="gap-2 font-semibold"
              >
                <span className="inline-flex items-center gap-2">
                  <GithubLogoIcon className="h-4 w-4" weight="fill" />
                  Open an Issue
                </span>
              </Button>

              <Button
                asChild={
                  <a
                    href="https://github.com/tashfiqul-islam/metro-station-finder"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View Repository
                  </a>
                }
                className="font-semibold"
                variant="outline"
              />
            </div>
          </div>
        </ViewportAnimation>
      </div>
    </section>
  </div>
);

/* v8 ignore next -- framework route registration glue */
export const Route = createFileRoute("/about")({
  component: About,
  head: () =>
    generateHeadConfig({
      description:
        "Learn about Metro Station Finder, the maintainer behind it, and the open-source intent shaping the product.",
      path: "/about",
      title: "About",
    }),
});
