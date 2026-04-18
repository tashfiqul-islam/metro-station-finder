import {
  Coffee,
  CurrencyCircleDollar,
  GithubLogo,
  Heart,
  MagnifyingGlass,
  MapTrifold,
  TrainSimple,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { memo } from "react";

import { FooterWatermark } from "./footer-watermark";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/data-sources", label: "Data Sources" },
] as const;

export const Footer = memo(
  (): React.ReactElement => (
    <div className="relative">
      {/* Watermark sits above the footer border */}
      <FooterWatermark />

      <footer aria-label="Site footer" className="relative border-t border-border/40 bg-background">
        {/* Shimmer on top border */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 5%, oklch(0.50 0.18 145 / 0.45) 50%, transparent 95%)",
          }}
        />

        {/* Top glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-20"
          style={{
            background:
              "radial-gradient(50% 100% at 50% 0%, oklch(0.50 0.18 145 / 0.3), transparent)",
          }}
        />

        <div className="container mx-auto px-4 pb-8 pt-10">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {/* ── Brand ── */}
            <div className="flex flex-col gap-5">
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

              <div className="flex flex-wrap items-center gap-3">
                {/* GitHub pill */}
                <a
                  aria-label="View source on GitHub"
                  className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-foreground"
                  href="https://github.com/tashfiqul-islam/metro-station-finder"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <GithubLogo aria-hidden="true" className="h-3.5 w-3.5" weight="fill" />
                  GitHub
                </a>

                {/* Fare routes quick link */}
                <Link
                  className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-foreground"
                  to="/station-fares"
                >
                  <CurrencyCircleDollar
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    weight="duotone"
                  />
                  Check Fares
                </Link>

                {/* Station finder quick link */}
                <Link
                  className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-foreground"
                  to="/station-finder"
                >
                  <MagnifyingGlass aria-hidden="true" className="h-3.5 w-3.5" weight="duotone" />
                  Find Station
                </Link>

                {/* Trip planner quick link */}
                <Link
                  className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-foreground"
                  to="/trip-planner"
                >
                  <MapTrifold aria-hidden="true" className="h-3.5 w-3.5" weight="duotone" />
                  Plan Trip
                </Link>
              </div>
            </div>

            {/* ── Legal ── */}
            <div>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
                Legal
              </h2>
              <ul className="flex flex-col gap-2.5">
                {LEGAL_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <a
                      className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                      href={href}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Project ── */}
            <div>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
                Project
              </h2>
              <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <li>Open source · MIT License</li>
                <li>MRT Line 6 data accurate as of 2026</li>
                <li>Covers all 16 stations &amp; 120+ routes</li>
                <li>No account or login required</li>
              </ul>
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/40 pt-6 sm:flex-row sm:items-center">
            {/* Left: copyright + unique links (not duplicated from Legal column) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <span>&copy; 2026 Metro Station Finder</span>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <Link className="transition-colors duration-200 hover:text-foreground" to="/about">
                About
              </Link>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <a className="transition-colors duration-200 hover:text-foreground" href="/changelog">
                Changelog
              </a>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <a
                className="transition-colors duration-200 hover:text-foreground"
                href="https://github.com/tashfiqul-islam/metro-station-finder"
                rel="noopener noreferrer"
                target="_blank"
              >
                Open Source
              </a>
            </div>

            {/* Right: built with love and coffee */}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              Built with
              <Heart aria-hidden="true" className="h-3 w-3 text-red-400/70" weight="fill" />
              and
              <Coffee aria-hidden="true" className="h-3 w-3 text-amber-500/60" weight="duotone" />
              by{" "}
              <a
                className="text-muted-foreground/70 transition-colors duration-200 hover:text-foreground"
                href="https://github.com/tashfiqul-islam"
                rel="noopener noreferrer"
                target="_blank"
              >
                Tashfiqul Islam
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  ),
);

Footer.displayName = "Footer";
