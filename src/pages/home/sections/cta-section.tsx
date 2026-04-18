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
import { MetroTrain } from "@/components/ui/metro-train";
import { cn } from "@/lib/utils";

const STATS = [
  {
    color: "oklch(0.48 0.20 249)",
    colorBg: "oklch(0.48 0.20 249 / 0.10)",
    icon: MapTrifold,
    label: "Stations mapped",
    sublabel: "All of MRT Line 6",
    value: "16",
  },
  {
    color: "oklch(0.58 0.17 75)",
    colorBg: "oklch(0.58 0.17 75 / 0.10)",
    icon: CurrencyCircleDollar,
    label: "Fare routes",
    sublabel: "Every station pair",
    value: "120+",
  },
  {
    color: "oklch(0.50 0.18 145)",
    colorBg: "oklch(0.50 0.18 145 / 0.10)",
    icon: CheckCircle,
    label: "Always free",
    sublabel: "No login required",
    value: "Free",
  },
] as const;

export const CtaSection = memo(
  (): React.ReactElement => (
    <section aria-label="Get started" className="relative overflow-hidden pb-0 pt-24">
      {/* Section-level atmosphere blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 -top-24 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "oklch(0.57 0.19 249 / 0.05)" }}
        />
        <div
          className="absolute -bottom-32 -right-40 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: "oklch(0.50 0.18 145 / 0.06)" }}
        />
      </div>

      <div className="container relative mx-auto px-4">
        <ViewportAnimation>
          {/* 1px gradient border wrapper */}
          <div
            className="mx-auto max-w-2xl rounded-3xl p-px"
            style={{
              background:
                "linear-gradient(145deg, oklch(0.48 0.20 249 / 0.30), oklch(0.50 0.18 145 / 0.40) 55%, oklch(0.52 0.20 299 / 0.25))",
            }}
          >
            <div className="bg-card relative overflow-hidden rounded-[calc(1.5rem-1px)]">
              {/* Top shimmer */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 10%, oklch(0.50 0.18 145 / 0.5) 50%, transparent 90%)",
                }}
              />

              {/* Stats row */}
              <div className="relative grid grid-cols-3 border-b border-border/50">
                {STATS.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className={cn(
                        "group flex flex-col items-center gap-2.5 px-4 py-6 text-center sm:px-8",
                        i < STATS.length - 1 && "border-r border-border/50",
                      )}
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                        style={{ background: stat.colorBg }}
                      >
                        <Icon
                          aria-hidden="true"
                          className="h-5 w-5"
                          style={{ color: stat.color }}
                          weight="duotone"
                        />
                      </div>

                      <span className="font-heading text-3xl font-black leading-none text-foreground lg:text-4xl">
                        {stat.value}
                      </span>

                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">{stat.label}</p>
                        <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA body */}
              <div className="relative px-8 py-12 text-center sm:px-14">
                {/* Eyebrow */}
                <div className="mb-5 flex items-center justify-center gap-3">
                  <div className="h-px w-8 bg-primary/40" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary/60">
                    MRT Line 6 · Dhaka
                  </span>
                  <div className="h-px w-8 bg-primary/40" />
                </div>

                {/* Heading — semantic tokens, readable in both themes */}
                <h2 className="font-heading mb-4 text-3xl font-extrabold text-foreground lg:text-4xl">
                  Ready to ride <span className="text-primary">smarter?</span>
                </h2>

                <p className="mb-10 text-base text-muted-foreground">
                  Plan your next MRT journey in seconds — no account, no hassle.
                </p>

                {/* Buttons */}
                <div className="relative flex flex-wrap items-center justify-center gap-3">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-1/4 top-1/2 h-12 -translate-y-1/2 blur-2xl"
                    style={{ background: "oklch(0.50 0.18 145 / 0.18)" }}
                  />
                  <Button
                    asChild={
                      <Link to="/station-finder">
                        <MagnifyingGlass
                          aria-hidden="true"
                          className="mr-2 h-4 w-4"
                          weight="bold"
                        />
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
          </div>
        </ViewportAnimation>
      </div>

      {/* Metro train illustration — sits flush on the footer border-t rail */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative mt-12 w-full overflow-hidden"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      >
        <MetroTrain />
      </div>
    </section>
  ),
);

CtaSection.displayName = "CtaSection";
