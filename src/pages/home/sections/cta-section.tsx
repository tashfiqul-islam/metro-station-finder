import {
  CheckCircle,
  CurrencyCircleDollar,
  MagnifyingGlass,
  MapTrifold,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { memo } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATS = [
  {
    color: "oklch(0.60 0.18 249)",
    colorBg: "oklch(0.57 0.19 249 / 0.12)",
    colorGrad: "linear-gradient(135deg, oklch(0.50 0.20 249), oklch(0.68 0.16 249))",
    icon: MapTrifold,
    label: "Stations mapped",
    sublabel: "All of MRT Line 6",
    value: "16",
  },
  {
    color: "oklch(0.74 0.15 75)",
    colorBg: "oklch(0.78 0.13 75 / 0.12)",
    colorGrad: "linear-gradient(135deg, oklch(0.64 0.17 75), oklch(0.82 0.11 75))",
    icon: CurrencyCircleDollar,
    label: "Fare routes",
    sublabel: "Every station pair",
    value: "120+",
  },
  {
    color: "oklch(0.64 0.2 145)",
    colorBg: "oklch(0.64 0.2 145 / 0.12)",
    colorGrad:
      "linear-gradient(135deg, oklch(0.52 0.12 145), oklch(0.72 0.18 145) 50%, oklch(0.60 0.20 145))",
    icon: CheckCircle,
    label: "Always free",
    sublabel: "No login required",
    value: "Free",
  },
] as const;

export const CtaSection = memo(
  (): React.ReactElement => (
    <section aria-label="Get started" className="relative overflow-hidden py-24">
      {/* Background atmosphere — layered aurora blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 -top-24 h-80 w-80 rounded-full blur-3xl"
          style={{ background: "oklch(0.57 0.19 249 / 0.07)" }}
        />
        <div
          className="absolute -bottom-24 -right-40 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "oklch(0.64 0.2 145 / 0.09)" }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-72 w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: "oklch(0.64 0.2 145 / 0.04)" }}
        />
      </div>

      <div className="container relative mx-auto px-4">
        {/* ── Stats ── */}
        <ViewportAnimation>
          <div className="mx-auto mb-16 grid max-w-2xl grid-cols-3">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={cn(
                    "group flex flex-col items-center gap-3 px-4 py-4 text-center sm:px-8",
                    i < STATS.length - 1 && "border-r border-border/40",
                  )}
                >
                  {/* Icon badge */}
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/40 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg"
                    style={{
                      background: stat.colorBg,
                      boxShadow: `0 0 0 0 transparent`,
                    }}
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5"
                      style={{ color: stat.color }}
                      weight="duotone"
                    />
                  </div>

                  {/* Value */}
                  <span
                    className="font-heading text-4xl font-black leading-none lg:text-5xl"
                    style={{
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      background: stat.colorGrad,
                      backgroundClip: "text",
                    }}
                  >
                    {stat.value}
                  </span>

                  {/* Labels */}
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{stat.label}</p>
                    <p className="text-xs text-muted-foreground/60">{stat.sublabel}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ViewportAnimation>

        {/* ── CTA card ── */}
        <ViewportAnimation delay={0.15}>
          {/* Gradient border wrapper — 1px gradient stroke */}
          <div
            className="mx-auto max-w-2xl rounded-3xl p-px"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.57 0.19 249 / 0.4), oklch(0.64 0.2 145 / 0.6) 50%, oklch(0.61 0.23 299 / 0.35))",
            }}
          >
            <div className="glass-card relative overflow-hidden rounded-[calc(1.5rem-1px)] px-8 py-12 text-center sm:px-14">
              {/* Inner bottom glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-36"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 60% at 50% 100%, oklch(0.64 0.2 145 / 0.12), transparent)",
                }}
              />

              {/* Top shimmer line */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, oklch(0.64 0.2 145 / 0.5) 50%, transparent)",
                }}
              />

              {/* Eyebrow */}
              <div className="relative mb-5 flex items-center justify-center gap-3">
                <div className="h-px w-8 bg-primary/50" />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
                  MRT Line 6 · Dhaka
                </span>
                <div className="h-px w-8 bg-primary/50" />
              </div>

              {/* Heading */}
              <h2
                className="font-heading relative mb-3 text-3xl font-bold lg:text-4xl"
                style={{
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  background:
                    "linear-gradient(135deg, oklch(0.52 0.12 145), oklch(0.72 0.18 145) 45%, oklch(0.58 0.22 145))",
                  backgroundClip: "text",
                }}
              >
                Ready to ride smarter?
              </h2>

              <p className="relative mb-10 text-muted-foreground">
                Plan your next MRT journey in seconds — no account, no hassle.
              </p>

              {/* Buttons with ambient glow */}
              <div className="relative flex flex-wrap items-center justify-center gap-3">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-1/4 top-1/2 h-10 -translate-y-1/2 blur-2xl"
                  style={{ background: "oklch(0.64 0.2 145 / 0.2)" }}
                />
                <Button
                  asChild={
                    <Link to="/station-finder">
                      <MagnifyingGlass aria-hidden="true" className="mr-2 h-4 w-4" weight="bold" />
                      Find a Station
                    </Link>
                  }
                  size="lg"
                />
                <Button
                  asChild={
                    <Link to="/station-fares">
                      <CurrencyCircleDollar
                        aria-hidden="true"
                        className="mr-2 h-4 w-4"
                        weight="duotone"
                      />
                      Check Fares
                    </Link>
                  }
                  size="lg"
                  variant="outline"
                />
              </div>
            </div>
          </div>
        </ViewportAnimation>
      </div>
    </section>
  ),
);

CtaSection.displayName = "CtaSection";
