"use client";

import {
  Building2,
  Code,
  Database,
  ExternalLink,
  Eye,
  Github,
  Info,
  MapPin,
  Shield,
  Train,
  Users,
} from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Section type for navigation and rendering.
 */
type Section = {
  readonly id: string;
  readonly title: string;
  readonly icon: React.ComponentType<{ className?: string }>;
};

/**
 * Page sections with navigation links.
 */
const SECTIONS: readonly Section[] = [
  { id: "about", title: "About", icon: Info },
  { id: "attribution", title: "Attribution", icon: Database },
  { id: "privacy", title: "Privacy", icon: Shield },
  { id: "license", title: "License", icon: Code },
  { id: "diagnostics", title: "Diagnostics", icon: Eye },
] as const;

/**
 * Data source information.
 */
type DataSource = {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly license: string;
};

/**
 * Feature information.
 */
type Feature = {
  readonly name: string;
  readonly description: string;
  readonly icon: React.ComponentType<{ className?: string }>;
};

/**
 * Project features list.
 */
const FEATURES: readonly Feature[] = [
  {
    name: "Station Finder",
    description: "Search and discover metro stations with interactive maps",
    icon: MapPin,
  },
  {
    name: "Fare Calculator",
    description: "Calculate fares between stations with ticket type discounts",
    icon: Train,
  },
  {
    name: "Real-time Updates",
    description: "Get accurate fare and station information",
    icon: Database,
  },
  {
    name: "Accessibility",
    description: "WCAG 2.2 AA compliant with keyboard navigation support",
    icon: Users,
  },
] as const;

/**
 * Data sources with proper attribution.
 */
const DATA_SOURCES: readonly DataSource[] = [
  {
    name: "Dhaka Mass Transit Company Limited (DMTCL)",
    description:
      "Official fare data, station information, and operational status for MRT-6 line",
    url: "https://dmtc.gov.bd",
    license: "Public Data",
  },
  {
    name: "Google Maps Platform",
    description:
      "Interactive maps, geolocation services, and place information",
    url: "https://developers.google.com/maps",
    license: "Google Maps Platform Terms",
  },
] as const;

/**
 * Technology stack information.
 */
const TECH_STACK = {
  frontend: ["Next.js 16", "React 19", "TypeScript 5.9", "Tailwind CSS v4"],
  ui: ["shadcn/ui", "Radix UI", "Lucide Icons"],
  maps: ["Google Maps JavaScript API", "@vis.gl/react-google-maps"],
  tools: ["Bun", "Ultracite (Biome)", "Git"],
} as const;

/**
 * Renders a section navigation item.
 */
const SectionNav = memo(
  ({
    section,
    isActive,
    onClick,
  }: {
    readonly section: Section;
    readonly isActive: boolean;
    readonly onClick: () => void;
  }) => {
    const Icon = section.icon;
    return (
      <button
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200",
          isActive
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={onClick}
        type="button"
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "h-4 w-4 transition-colors duration-200",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span>{section.title}</span>
      </button>
    );
  }
);

SectionNav.displayName = "SectionNav";

/**
 * Renders a feature card.
 */
const FeatureCard = memo(({ feature }: { readonly feature: Feature }) => {
  const Icon = feature.icon;
  return (
    <Card>
      <CardContent className="flex gap-4 p-6">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon aria-hidden="true" className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="mb-1 font-semibold text-base">{feature.name}</h3>
          <p className="text-muted-foreground text-sm">{feature.description}</p>
        </div>
      </CardContent>
    </Card>
  );
});

FeatureCard.displayName = "FeatureCard";

/**
 * Renders a data source card with attribution.
 */
const DataSourceCard = memo(({ source }: { readonly source: DataSource }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <Database aria-hidden="true" className="h-5 w-5 text-primary" />
        {source.name}
      </CardTitle>
      <CardDescription className="text-base">
        {source.description}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between gap-4">
        <Badge variant="secondary">{source.license}</Badge>
        <Button asChild size="sm" variant="outline">
          <a href={source.url} rel="noopener noreferrer" target="_blank">
            Visit Site
            <ExternalLink aria-hidden="true" className="ml-2 h-3 w-3" />
          </a>
        </Button>
      </div>
    </CardContent>
  </Card>
));

DataSourceCard.displayName = "DataSourceCard";

/**
 * Renders the diagnostics toggle section.
 */
const DiagnosticsSection = memo(() => {
  const [doNotTrack, setDoNotTrack] = useState<boolean>(false);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Check Do Not Track setting
    const dnt =
      navigator.doNotTrack === "1" ||
      // @ts-expect-error - Legacy browser support
      window.doNotTrack === "1" ||
      // @ts-expect-error - Legacy browser support
      navigator.msDoNotTrack === "1";
    setDoNotTrack(dnt);

    // Respect DNT for diagnostics
    if (!dnt) {
      const saved = localStorage.getItem("diagnostics-enabled");
      setDiagnosticsEnabled(saved === "true");
    }
  }, []);

  const handleToggle = () => {
    if (doNotTrack) {
      return;
    }
    const newValue = !diagnosticsEnabled;
    setDiagnosticsEnabled(newValue);
    localStorage.setItem("diagnostics-enabled", String(newValue));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye aria-hidden="true" className="h-5 w-5 text-primary" />
          Diagnostics
        </CardTitle>
        <CardDescription className="text-base">
          Help us improve by allowing anonymous usage diagnostics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-base">Enable Diagnostics</div>
            <div className="text-muted-foreground text-sm">
              {doNotTrack
                ? "Disabled (Do Not Track detected)"
                : "Collect anonymous usage data"}
            </div>
          </div>
          <button
            aria-checked={diagnosticsEnabled && !doNotTrack}
            aria-label="Toggle diagnostics"
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              diagnosticsEnabled && !doNotTrack ? "bg-primary" : "bg-muted",
              doNotTrack && "cursor-not-allowed opacity-50"
            )}
            disabled={doNotTrack}
            onClick={handleToggle}
            role="switch"
            type="button"
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                diagnosticsEnabled && !doNotTrack
                  ? "translate-x-6"
                  : "translate-x-1"
              )}
            />
          </button>
        </div>

        {doNotTrack && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-base">
              We respect your Do Not Track browser setting. Diagnostics are
              automatically disabled.
            </p>
          </div>
        )}

        <div className="space-y-2 text-base text-muted-foreground">
          <p className="font-medium">What we collect:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Page views and navigation patterns</li>
            <li>Feature usage statistics</li>
            <li>Error reports and performance metrics</li>
          </ul>
          <p className="mt-2 font-medium">What we don't collect:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Personal information or identifiers</li>
            <li>Search queries or location data</li>
            <li>IP addresses or device fingerprints</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
});

DiagnosticsSection.displayName = "DiagnosticsSection";

/**
 * About content component with all client-side logic.
 */
export function AboutContent() {
  const [activeSection, setActiveSection] = useState<string>("about");

  useEffect(() => {
    // Handle hash navigation
    const hash = window.location.hash.slice(1);
    if (hash && SECTIONS.some((s) => s.id === hash)) {
      setActiveSection(hash);
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    window.history.pushState(null, "", `#${id}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Main Content */}
      <main className="flex-1 bg-muted/30 pb-4 md:pb-16">
        <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Section Navigation - Desktop Only */}
          <nav
            aria-label="Page sections"
            className="sticky top-20 z-40 mb-8 hidden rounded-xl border border-border/50 bg-background/95 p-2 backdrop-blur-sm md:block"
          >
            <ul className="flex justify-center gap-2">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <SectionNav
                    isActive={activeSection === section.id}
                    onClick={() => scrollToSection(section.id)}
                    section={section}
                  />
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            {/* About Section */}
            <section className="scroll-mt-24 space-y-6" id="about">
              <div>
                <h2 className="mb-2 font-bold text-3xl">
                  About Metro Station Finder
                </h2>
                <p className="text-muted-foreground text-xl">
                  Your comprehensive guide to navigating Dhaka's MRT-6 metro
                  system
                </p>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4 text-base text-muted-foreground">
                    <p>
                      Metro Station Finder is a modern, accessible web
                      application designed to help commuters navigate Dhaka's
                      Mass Rapid Transit (MRT) Line 6. Built with the latest web
                      technologies and following best practices for performance
                      and accessibility, it provides accurate fare calculations,
                      station information, and interactive maps.
                    </p>
                    <p>
                      Our mission is to make metro travel more accessible and
                      convenient for everyone in Dhaka by providing a fast,
                      reliable, and easy-to-use platform that works seamlessly
                      across all devices.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <div>
                <h3 className="mb-4 font-semibold text-xl">Key Features</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {FEATURES.map((feature) => (
                    <FeatureCard feature={feature} key={feature.name} />
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div>
                <h3 className="mb-4 font-semibold text-xl">Technology Stack</h3>
                <Card>
                  <CardContent className="p-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <div className="mb-3 flex items-center gap-2 font-medium text-sm">
                          <Code
                            aria-hidden="true"
                            className="h-4 w-4 text-primary"
                          />
                          Frontend
                        </div>
                        <ul className="space-y-1 text-muted-foreground text-sm">
                          {TECH_STACK.frontend.map((tech) => (
                            <li key={tech}>• {tech}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="mb-3 flex items-center gap-2 font-medium text-sm">
                          <Building2
                            aria-hidden="true"
                            className="h-4 w-4 text-primary"
                          />
                          UI Components
                        </div>
                        <ul className="space-y-1 text-muted-foreground text-sm">
                          {TECH_STACK.ui.map((tech) => (
                            <li key={tech}>• {tech}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="mb-3 flex items-center gap-2 font-medium text-sm">
                          <MapPin
                            aria-hidden="true"
                            className="h-4 w-4 text-primary"
                          />
                          Maps & Location
                        </div>
                        <ul className="space-y-1 text-muted-foreground text-sm">
                          {TECH_STACK.maps.map((tech) => (
                            <li key={tech}>• {tech}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="mb-3 flex items-center gap-2 font-medium text-sm">
                          <Github
                            aria-hidden="true"
                            className="h-4 w-4 text-primary"
                          />
                          Development Tools
                        </div>
                        <ul className="space-y-1 text-muted-foreground text-sm">
                          {TECH_STACK.tools.map((tech) => (
                            <li key={tech}>• {tech}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Attribution Section */}
            <section className="scroll-mt-24 space-y-6" id="attribution">
              <div>
                <h2 className="mb-2 font-bold text-3xl">Data Attribution</h2>
                <p className="text-muted-foreground text-xl">
                  Acknowledging our data sources and partners
                </p>
              </div>

              <div className="space-y-4">
                {DATA_SOURCES.map((source) => (
                  <DataSourceCard key={source.name} source={source} />
                ))}
              </div>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex gap-3 p-6">
                  <Info
                    aria-hidden="true"
                    className="h-5 w-5 flex-shrink-0 text-primary"
                  />
                  <div className="space-y-2 text-base">
                    <p className="font-medium">Important Notice</p>
                    <p className="text-muted-foreground">
                      All fare data and station information are sourced from
                      official DMTCL publications and are subject to change.
                      While we strive to maintain accuracy, please verify
                      critical information with official sources. This is an
                      independent project and is not officially affiliated with
                      or endorsed by DMTCL or Google.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Privacy Section */}
            <section className="scroll-mt-24 space-y-6" id="privacy">
              <div>
                <h2 className="mb-2 font-bold text-3xl">Privacy Policy</h2>
                <p className="text-muted-foreground text-xl">
                  How we protect and respect your privacy
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield
                      aria-hidden="true"
                      className="h-5 w-5 text-primary"
                    />
                    Your Privacy Matters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="mb-2 font-semibold text-lg">
                      Information We Collect
                    </h3>
                    <ul className="ml-4 list-disc space-y-2 text-base text-muted-foreground">
                      <li>
                        <strong>Location Data:</strong> When you use the "Use My
                        Location" feature, your browser provides approximate
                        coordinates. This data is processed locally and never
                        sent to our servers.
                      </li>
                      <li>
                        <strong>Search Queries:</strong> Station searches are
                        processed client-side and are not stored or transmitted.
                      </li>
                      <li>
                        <strong>Usage Analytics:</strong> If diagnostics are
                        enabled, we collect anonymous usage statistics to
                        improve the application. This respects Do Not Track
                        settings.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-lg">
                      How We Use Your Information
                    </h3>
                    <ul className="ml-4 list-disc space-y-2 text-base text-muted-foreground">
                      <li>
                        Calculate distances and fares based on your location
                      </li>
                      <li>Provide personalized station recommendations</li>
                      <li>
                        Improve application performance and user experience
                      </li>
                      <li>Debug issues and enhance features</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-lg">
                      Third-Party Services
                    </h3>
                    <ul className="ml-4 list-disc space-y-2 text-base text-muted-foreground">
                      <li>
                        <strong>Google Maps Platform:</strong> Map tiles and
                        geolocation services are provided by Google. Your usage
                        is subject to{" "}
                        <a
                          className="text-primary underline-offset-4 hover:underline"
                          href="https://policies.google.com/privacy"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Google's Privacy Policy
                        </a>
                        .
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-lg">Your Rights</h3>
                    <ul className="ml-4 list-disc space-y-2 text-base text-muted-foreground">
                      <li>Deny location permission at any time</li>
                      <li>
                        Enable or disable diagnostics in the settings below
                      </li>
                      <li>
                        Use Do Not Track to automatically disable all tracking
                      </li>
                      <li>Browse anonymously without creating an account</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="font-medium text-base">
                      Last Updated: December 2024
                    </p>
                    <p className="mt-2 text-base text-muted-foreground">
                      We are committed to protecting your privacy and will never
                      sell your personal information to third parties.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* License Section */}
            <section className="scroll-mt-24 space-y-6" id="license">
              <div>
                <h2 className="mb-2 font-bold text-3xl">Open Source License</h2>
                <p className="text-muted-foreground text-xl">
                  This project is open source and available under the MIT
                  License
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code aria-hidden="true" className="h-5 w-5 text-primary" />
                    MIT License
                  </CardTitle>
                  <CardDescription className="text-base">
                    A permissive open source license that allows commercial use
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="mb-2 font-semibold text-lg">
                      What this means:
                    </h3>
                    <ul className="ml-4 list-disc space-y-2 text-base text-muted-foreground">
                      <li>
                        <strong>Free to use:</strong> Anyone can use this
                        project for any purpose
                      </li>
                      <li>
                        <strong>Commercial use allowed:</strong> Companies and
                        organizations can use it in their products
                      </li>
                      <li>
                        <strong>Modification permitted:</strong> You can modify
                        and distribute the code
                      </li>
                      <li>
                        <strong>Attribution required:</strong> You must include
                        the original license and copyright notice
                      </li>
                      <li>
                        <strong>No warranty:</strong> The software is provided
                        "as is" without any guarantees
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-lg">
                      How to use this project:
                    </h3>
                    <ul className="ml-4 list-disc space-y-2 text-base text-muted-foreground">
                      <li>
                        <strong>Fork the repository</strong> and make your own
                        modifications
                      </li>
                      <li>
                        <strong>Use as a template</strong> for your own metro
                        station finder apps
                      </li>
                      <li>
                        <strong>Contribute back</strong> by submitting pull
                        requests and issues
                      </li>
                      <li>
                        <strong>Deploy for your city</strong> by adapting the
                        data and configuration
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <Github className="mr-1 h-3 w-3" />
                      Open Source
                    </Badge>
                    <Badge variant="secondary">
                      <Code className="mr-1 h-3 w-3" />
                      MIT License
                    </Badge>
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      Community Driven
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex gap-3 p-6">
                  <Github
                    aria-hidden="true"
                    className="h-5 w-5 flex-shrink-0 text-primary"
                  />
                  <div className="space-y-2 text-base">
                    <p className="font-medium">Full License Text</p>
                    <p className="text-muted-foreground">
                      The complete MIT License text is available in the{" "}
                      <a
                        className="text-primary underline-offset-4 hover:underline"
                        href="/LICENSE"
                        rel="noopener noreferrer"
                      >
                        LICENSE file
                      </a>{" "}
                      in the project repository.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Diagnostics Section */}
            <section className="scroll-mt-24 space-y-6" id="diagnostics">
              <div>
                <h2 className="mb-2 font-bold text-3xl">
                  Diagnostics Settings
                </h2>
                <p className="text-muted-foreground text-xl">
                  Control anonymous usage data collection
                </p>
              </div>

              <DiagnosticsSection />
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-border/40 border-t bg-background py-8">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-base text-muted-foreground">
              <Train aria-hidden="true" className="h-4 w-4 text-primary" />
              <span>Metro Station Finder</span>
              <span>•</span>
              <span>© 2024</span>
            </div>

            <nav aria-label="Footer navigation">
              <ul className="flex gap-6 text-base text-muted-foreground">
                <li>
                  <Link
                    className="transition-colors hover:text-foreground"
                    href="/"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    className="transition-colors hover:text-foreground"
                    href="/station-finder"
                  >
                    Stations
                  </Link>
                </li>
                <li>
                  <Link
                    className="transition-colors hover:text-foreground"
                    href="/fare-calculator"
                  >
                    Fares
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
