import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { memo } from "react";

interface LegalPageProps {
  children: React.ReactNode;
  lastUpdated: string;
  subtitle: string;
  title: string;
}

interface LegalSectionProps {
  children: React.ReactNode;
  title: string;
}

export const LegalSection = memo<LegalSectionProps>(
  ({ title, children }): React.ReactElement => (
    <section className="section-card space-y-4 p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <div aria-hidden className="h-px w-6 bg-primary/40" />
        <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  ),
);
LegalSection.displayName = "LegalSection";

export const LegalPage = memo<LegalPageProps>(
  ({ title, subtitle, lastUpdated, children }): React.ReactElement => (
    <div className="relative min-h-screen overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(46% 26% at 18% 14%, oklch(0.64 0.2 145 / 0.10), transparent), radial-gradient(32% 20% at 82% 26%, oklch(0.60 0.18 249 / 0.08), transparent)",
        }}
      />

      <div className="container relative mx-auto px-4 pb-24 pt-18 lg:pt-22">
        <Link
          className="section-chip mb-10 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          to="/"
        >
          <ArrowLeftIcon aria-hidden="true" className="h-3.5 w-3.5" weight="bold" />
          Back to home
        </Link>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-14">
          <div className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-primary/50" />
              <span className="section-kicker">Metro Station Finder</span>
            </div>

            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground lg:text-5xl">
              {title}
            </h1>

            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">{subtitle}</p>

            <div className="section-panel mt-8 p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                Reference
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                This page explains the policy and operational details in plain language, so riders
                know exactly what to expect from the product.
              </p>

              <div className="mt-5 inline-flex items-center rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs text-muted-foreground/70">
                Last updated · {lastUpdated}
              </div>
            </div>
          </div>

          <div className="space-y-5">{children}</div>
        </div>
      </div>
    </div>
  ),
);
LegalPage.displayName = "LegalPage";
