import { CoffeeIcon, GithubLogoIcon, HeartStraightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { memo } from "react";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/data-sources", label: "Data Sources" },
] as const;

const FOOTER_NOTES = ["No sign-up", "Fare clarity", "Built for Dhaka"] as const;

export const Footer = memo(
  (): React.ReactElement => (
    <footer
      aria-label="Site footer"
      className="relative overflow-hidden border-t border-border/35 bg-background pt-14 sm:pt-16"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 24% at 50% 0%, oklch(0.64 0.2 145 / 0.14), transparent), radial-gradient(28% 18% at 78% 24%, oklch(0.60 0.18 249 / 0.08), transparent)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 10%, oklch(0.64 0.2 145 / 0.55) 50%, transparent 90%)",
        }}
      />

      <div className="relative container mx-auto px-4 pb-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-8">
          <div className="max-w-xl">
            <div className="mb-4">
              <span className="sr-only">Metro Station Finder</span>
              <img
                alt=""
                aria-hidden="true"
                className="h-11 w-auto dark:hidden"
                src="/brand/logo/logo-primary-light.svg"
              />
              <img
                alt=""
                aria-hidden="true"
                className="hidden h-11 w-auto dark:block"
                src="/brand/logo/logo-primary-dark.svg"
              />
            </div>

            <h2 className="font-heading max-w-[12ch] text-2xl font-black tracking-tighter text-foreground sm:text-3xl lg:text-4xl">
              <span className="footer-headline-glow block">Dhaka moves better</span>
              <span className="footer-headline-glow block">when the route is clear.</span>
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
              Stations, fares, and trip planning for MRT Line 6, built for commuters who need the
              answer quickly and want the route to feel obvious.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {FOOTER_NOTES.map((note) => (
                <span
                  className="section-chip px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75"
                  key={note}
                >
                  {note}
                </span>
              ))}
            </div>
          </div>

          <div className="section-panel rounded-[1.6rem] p-5">
            <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                  Reference
                </div>
                <div className="mt-1 text-sm font-semibold tracking-tight text-foreground">
                  Legal and source
                </div>
              </div>

              <a
                aria-label="View source on GitHub"
                className="inline-flex items-center gap-2 rounded-full border border-border/45 bg-background/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-200 hover:border-primary/35 hover:text-foreground"
                href="https://github.com/tashfiqul-islam/metro-station-finder"
                rel="noopener noreferrer"
                target="_blank"
              >
                <GithubLogoIcon aria-hidden="true" className="h-3.5 w-3.5" weight="fill" />
                GitHub
              </a>
            </div>

            <div className="mt-4 grid gap-2">
              {LEGAL_LINKS.map(({ href, label }) => (
                <Link
                  className="group flex items-center justify-between rounded-xl border border-border/35 bg-background/65 px-4 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/25 hover:text-foreground"
                  key={href}
                  to={href}
                >
                  <span>{label}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground/55 transition-colors duration-200 group-hover:text-primary/80">
                    Open
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-border/35 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
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

          <p className="inline-flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground/75">
            <span>Built with</span>
            <HeartStraightIcon
              aria-hidden="true"
              className="h-3.5 w-3.5 text-primary"
              weight="fill"
            />
            <span>and</span>
            <CoffeeIcon aria-hidden="true" className="h-3.5 w-3.5 text-primary" weight="duotone" />
            <span>by</span>
            <a
              className="font-medium text-foreground/85 transition-colors duration-200 hover:text-foreground"
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
