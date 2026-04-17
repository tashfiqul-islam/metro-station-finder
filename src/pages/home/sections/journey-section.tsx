import { Badge } from "@/components/ui/badge";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { cn } from "@/lib/utils";

interface VersionEntry {
  version: string;
  date: string;
  label: string;
  description: string;
  current: boolean;
  accent: string;
  accentSolid: string;
}

const versions: VersionEntry[] = [
  {
    accent: "oklch(0.57 0.19 249 / 0.18)",
    accentSolid: "oklch(0.60 0.18 249)",
    current: false,
    date: "October 2024",
    description:
      "Launched the first version on Next.js 14 with page router architecture. Focused on solving the core problem: helping Dhaka commuters locate MRT Line 6 stations quickly with accurate data.",
    label: "The Beginning",
    version: "v0.1.0",
  },
  {
    accent: "oklch(0.78 0.13 75 / 0.18)",
    accentSolid: "oklch(0.74 0.15 75)",
    current: false,
    date: "November 2024",
    description:
      "Introduced the fare calculator with a complete single/return/MRT Pass pricing matrix. Upgraded the design system with Tailwind CSS for improved visual hierarchy and a modern look.",
    label: "Enhanced Features",
    version: "v0.2.0",
  },
  {
    accent: "oklch(0.61 0.23 299 / 0.18)",
    accentSolid: "oklch(0.63 0.21 299)",
    current: false,
    date: "January 2026",
    description:
      "Migrated the entire codebase from Next.js to TanStack Start. Rebuilt routing, data-fetching, and component architecture from the ground up with shadcn/ui and modern React patterns.",
    label: "Tech Stack Evolution",
    version: "v0.9.0",
  },
  {
    accent: "oklch(0.64 0.2 145 / 0.18)",
    accentSolid: "oklch(0.64 0.2 145)",
    current: true,
    date: "April 2026",
    description:
      "Complete UI/UX overhaul — world-class design system, aurora backgrounds, glassmorphism cards, animated navigation, and a fully responsive experience built for every commuter.",
    label: "You are here",
    version: "v1.0.0",
  },
];

export const JourneySection = (): React.ReactElement => (
  <section aria-label="Project journey" className="py-20">
    <div className="container mx-auto px-4">
      {/* ── Section header ── */}
      <ViewportAnimation>
        <div className="mb-16 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-primary/50" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
              Changelog
            </span>
            <div className="h-px w-8 bg-primary/50" />
          </div>
          <h2
            className="font-heading text-3xl font-bold lg:text-4xl"
            style={{
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              background:
                "linear-gradient(135deg, oklch(0.52 0.12 145), oklch(0.72 0.18 145) 45%, oklch(0.58 0.22 145))",
              backgroundClip: "text",
            }}
          >
            The journey
          </h2>
          <p className="mt-3 text-muted-foreground">
            From a Next.js prototype to a world-class transit companion.
          </p>
        </div>
      </ViewportAnimation>

      {/* ── Timeline ── */}
      <div className="relative mx-auto max-w-2xl">
        {/* Track line — centered at left-5 (20px), matching node centers */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-5 top-3 w-px -translate-x-1/2"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, oklch(0.57 0.19 249 / 0.5) 10%, oklch(0.61 0.23 299 / 0.4) 50%, oklch(0.64 0.2 145 / 0.7) 90%, transparent 100%)",
          }}
        />

        <div className="flex flex-col gap-8">
          {versions.map((v, i) => (
            <ViewportAnimation key={v.version} delay={i * 0.1}>
              <div className="relative flex items-start gap-5 pl-14">
                {/* Timeline node — centered at left-5, matches track */}
                <div
                  className={cn(
                    "absolute left-5 top-5 -translate-x-1/2",
                    v.current ? "route-stop route-stop--current" : "route-stop",
                  )}
                />

                {/* Card — solid bg-card ensures visibility on dark backgrounds */}
                <div
                  className={cn(
                    "group relative flex-1 overflow-hidden rounded-2xl border shadow-sm transition-all duration-300",
                    "hover:-translate-y-0.5",
                    v.current
                      ? "border-primary/35 bg-card hover:border-primary/55 hover:shadow-[0_8px_32px_oklch(0.64_0.2_145/0.14)]"
                      : "border-border bg-card hover:shadow-md",
                  )}
                >
                  {/* Colored left accent stripe */}
                  <div
                    aria-hidden="true"
                    className="absolute left-0 top-0 h-full w-0.5"
                    style={{ background: v.accentSolid, opacity: v.current ? 0.75 : 0.45 }}
                  />

                  {/* Top shimmer — left-anchored */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{
                      background: `linear-gradient(90deg, ${v.accentSolid}, transparent 55%)`,
                      opacity: v.current ? 0.55 : 0.3,
                    }}
                  />

                  {/* Corner bloom */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-8 left-0 h-16 w-28 rounded-full blur-2xl"
                    style={{ background: v.accent }}
                  />

                  <div className="relative z-10 p-5 sm:p-6">
                    {/* Meta row */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge
                        className="font-mono text-xs"
                        style={{
                          backgroundColor: `${v.accentSolid}12`,
                          borderColor: `${v.accentSolid}40`,
                          color: v.accentSolid,
                        }}
                        variant="outline"
                      >
                        {v.version}
                      </Badge>
                      <span className="text-xs text-muted-foreground/70">{v.date}</span>
                      {v.current && (
                        <span
                          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: "oklch(0.64 0.2 145 / 0.12)",
                            border: "1px solid oklch(0.64 0.2 145 / 0.25)",
                            color: "oklch(0.64 0.2 145)",
                          }}
                        >
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                          </span>
                          Live
                        </span>
                      )}
                    </div>

                    {/* Label */}
                    <h3
                      className={cn(
                        "font-heading mb-2 text-lg font-bold",
                        v.current ? "text-primary" : "text-foreground",
                      )}
                    >
                      {v.label}
                    </h3>

                    {/* Description */}
                    <p className="text-sm leading-relaxed text-muted-foreground">{v.description}</p>
                  </div>
                </div>
              </div>
            </ViewportAnimation>
          ))}
        </div>
      </div>
    </div>
  </section>
);

JourneySection.displayName = "JourneySection";
