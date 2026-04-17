import { MagnifyingGlass, CurrencyCircleDollar } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { memo } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Button } from "@/components/ui/button";

const STATS = [
  { label: "Stations covered", value: "16" },
  { label: "Fare routes", value: "120+" },
  { label: "Always", value: "Free" },
] as const;

export const CtaSection = memo(
  (): React.ReactElement => (
    <section aria-label="Get started" className="relative overflow-hidden py-24">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, oklch(0.64 0.2 145 / 0.07), transparent)",
        }}
      />

      <div className="container relative mx-auto px-4">
        <ViewportAnimation>
          {/* Stats */}
          <div className="mx-auto mb-14 grid max-w-xl grid-cols-3 gap-6">
            {STATS.map((stat, i) => (
              <div key={stat.label} className="flex flex-col items-center gap-1 text-center">
                <span
                  className="font-heading text-4xl font-black lg:text-5xl"
                  style={{
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    background:
                      "linear-gradient(135deg, oklch(0.52 0.12 145), oklch(0.72 0.18 145) 50%, oklch(0.58 0.22 145))",
                    backgroundClip: "text",
                  }}
                >
                  {stat.value}
                </span>
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                {i < STATS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="absolute hidden h-10 w-px bg-border/60 lg:block"
                    style={{ transform: `translateX(calc(${(i + 1) * 100}% + ${i * 24}px))` }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-auto mb-14 h-px max-w-xs bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* CTA block */}
          <div className="mx-auto max-w-lg text-center">
            <h2
              className="font-heading mb-3 text-3xl font-bold lg:text-4xl"
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
            <p className="mb-8 text-muted-foreground">
              Plan your next MRT journey in seconds — no account, no hassle.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
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
        </ViewportAnimation>
      </div>
    </section>
  ),
);

CtaSection.displayName = "CtaSection";
