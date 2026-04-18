import {
  CurrencyCircleDollar,
  GithubLogo,
  House,
  Info,
  MagnifyingGlass,
  MapTrifold,
  TrainSimple,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { memo } from "react";

const NAV_LINKS = [
  { href: "/", icon: House, label: "Home" },
  { href: "/station-finder", icon: MagnifyingGlass, label: "Station Finder" },
  { href: "/station-fares", icon: CurrencyCircleDollar, label: "Station Fares" },
  { href: "/trip-planner", icon: MapTrifold, label: "Trip Planner" },
  { href: "/about", icon: Info, label: "About" },
] as const;

export const Footer = memo(
  (): React.ReactElement => (
    <footer aria-label="Site footer" className="relative border-t border-border/40 bg-background">
      {/* Gradient shimmer along the top border */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, oklch(0.50 0.18 145 / 0.45) 50%, transparent 95%)",
        }}
      />

      {/* Very faint aurora top-left */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-48 w-64 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "oklch(0.50 0.18 145 / 0.04)" }}
      />

      <div className="container mx-auto px-4 py-12 lg:py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          {/* ── Brand ── */}
          <div className="flex flex-col gap-5">
            {/* Logo lockup */}
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-px"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.50 0.18 145 / 0.5), oklch(0.48 0.20 249 / 0.35))",
                }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-[calc(0.5rem-1px)] bg-card">
                  <TrainSimple
                    aria-hidden="true"
                    className="h-4 w-4 text-primary"
                    weight="duotone"
                  />
                </div>
              </div>
              <span className="font-heading text-sm font-bold text-foreground">
                Metro Station Finder
              </span>
            </div>

            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Dhaka's go-to guide for MRT Line 6 — station search, fare lookup, and trip planning
              built for everyday commuters.
            </p>

            {/* GitHub pill */}
            <a
              aria-label="View source on GitHub"
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-foreground"
              href="https://github.com/tashfiqul-islam/metro-station-finder"
              rel="noopener noreferrer"
              target="_blank"
            >
              <GithubLogo aria-hidden="true" className="h-3.5 w-3.5" weight="fill" />
              tashfiqul-islam/metro-station-finder
            </a>
          </div>

          {/* ── Navigation ── */}
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Navigation
            </h2>
            <nav aria-label="Footer navigation">
              <ul className="flex flex-col gap-2.5">
                {NAV_LINKS.map(({ href, icon: Icon, label }) => (
                  <li key={href}>
                    <Link
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                      to={href}
                    >
                      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" weight="duotone" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* ── Project info ── */}
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Project
            </h2>
            <ul className="flex flex-col gap-2.5">
              <li className="text-sm text-muted-foreground">Open source · MIT License</li>
              <li className="text-sm text-muted-foreground">MRT Line 6 data accurate as of 2026</li>
              <li className="text-sm text-muted-foreground">
                Built with TanStack Start &amp; React 19
              </li>
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border/40 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 Tashfiqul Islam. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/40">
            v1.0.0 &nbsp;&middot;&nbsp; MRT Line 6 &nbsp;&middot;&nbsp; Dhaka, Bangladesh
          </p>
        </div>
      </div>
    </footer>
  ),
);

Footer.displayName = "Footer";
