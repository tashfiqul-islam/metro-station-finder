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
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  ),
);
LegalSection.displayName = "LegalSection";

export const LegalPage = memo<LegalPageProps>(
  ({ title, subtitle, lastUpdated, children }): React.ReactElement => (
    <div className="relative min-h-screen">
      {/* Ambient top glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-64 opacity-30"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, oklch(0.50 0.18 145 / 0.12), transparent)",
        }}
      />

      <div className="container relative mx-auto max-w-2xl px-4 pb-24 pt-12">
        {/* Back link */}
        <Link
          className="mb-10 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          to="/"
        >
          <ArrowLeftIcon aria-hidden="true" className="h-3.5 w-3.5" weight="bold" />
          Back to home
        </Link>

        {/* Page header */}
        <div className="mb-12">
          {/* Eyebrow */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px w-6 bg-primary/40" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary/60">
              Metro Station Finder
            </span>
          </div>

          <h1 className="font-heading mb-3 text-3xl font-extrabold text-foreground lg:text-4xl">
            {title}
          </h1>

          <p className="mb-5 text-base text-muted-foreground">{subtitle}</p>

          <div className="inline-flex items-center rounded-full border border-border/50 bg-card px-3 py-1 text-xs text-muted-foreground/70">
            Last updated · {lastUpdated}
          </div>
        </div>

        {/* Divider */}
        <div className="mb-10 h-px w-full bg-border/40" />

        {/* Content */}
        <div className="space-y-10">{children}</div>
      </div>
    </div>
  ),
);
LegalPage.displayName = "LegalPage";
