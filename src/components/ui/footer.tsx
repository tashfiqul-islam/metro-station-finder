import { CoffeeIcon, GithubLogoIcon, HeartIcon, TrainSimpleIcon } from "@phosphor-icons/react";
import { memo } from "react";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/data-sources", label: "Data Sources" },
] as const;

export const Footer = memo(
  (): React.ReactElement => (
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
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-12">
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
                  <TrainSimpleIcon
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

            <a
              aria-label="View source on GitHub"
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-foreground"
              href="https://github.com/tashfiqul-islam/metro-station-finder"
              rel="noopener noreferrer"
              target="_blank"
            >
              <GithubLogoIcon aria-hidden="true" className="h-3.5 w-3.5" weight="fill" />
              View on GitHub
            </a>
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
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/40 pt-6 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span>&copy; 2026 Metro Station Finder</span>
            <span aria-hidden="true" className="text-border">
              ·
            </span>
            <a
              className="transition-colors duration-200 hover:text-foreground"
              href="https://github.com/tashfiqul-islam/metro-station-finder/blob/main/LICENSE"
              rel="noopener noreferrer"
              target="_blank"
            >
              MIT License
            </a>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            Built with
            <HeartIcon aria-hidden="true" className="h-3 w-3 text-red-400/70" weight="fill" />
            and
            <CoffeeIcon aria-hidden="true" className="h-3 w-3 text-amber-500/60" weight="duotone" />
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
  ),
);

Footer.displayName = "Footer";
