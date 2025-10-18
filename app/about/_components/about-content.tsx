"use client";

import {
  ArrowRight,
  Building2,
  Code,
  Database,
  ExternalLink,
  Eye,
  Info,
  MapPin,
  Shield,
  Sparkles,
  Train,
  Users,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { memo, useEffect, useState } from "react";
import { SiGithub } from "react-icons/si";
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
 * Animation constants for modern micro-interactions
 */
const CUBIC_BEZIER_VALUES = {
  easeOutCubic: 0.22,
  easeOutQuart: 1,
  easeInCubic: 0.36,
  easeInQuart: 1,
} as const;

const ANIMATION_CONFIG = {
  spring: {
    type: "spring",
    stiffness: 100,
    damping: 20,
  },
  ease: [
    CUBIC_BEZIER_VALUES.easeOutCubic,
    CUBIC_BEZIER_VALUES.easeOutQuart,
    CUBIC_BEZIER_VALUES.easeInCubic,
    CUBIC_BEZIER_VALUES.easeInQuart,
  ] as const,
  durations: {
    fast: 0.3,
    normal: 0.5,
    slow: 0.7,
  },
  stagger: 0.1,
  scale: {
    hover: 1.02,
    tap: 0.98,
    icon: 1.1,
    background: 1.1,
  },
  rotation: {
    icon: 5,
    background: 360,
  },
  hover: {
    y: -4,
  },
  delay: {
    stagger: 0.1,
  },
  background: {
    size: {
      large: 40,
      medium: 32,
    },
    blur: {
      large: 3,
      medium: 2,
    },
  },
  spacing: {
    section: 8,
    card: 6,
    icon: 3,
  },
} as const;

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
 * Modern sticky navigation with glassmorphism effect
 */
const StickyNavigation = memo(
  ({
    sections,
    activeSection,
  }: {
    readonly sections: readonly Section[];
    readonly activeSection: string;
  }) => {
    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.nav
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-20 z-40 mb-8"
        initial={{ opacity: 0, y: -20 }}
        transition={{ duration: ANIMATION_CONFIG.durations.fast }}
      >
        <div className="rounded-2xl border border-border/50 bg-background/80 p-2 shadow-lg backdrop-blur-xl">
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <motion.a
                  className={cn(
                    "group relative flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-sm transition-all duration-200",
                    "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  href={`#${section.id}`}
                  key={section.id}
                  whileHover={{
                    scale: shouldReduceMotion
                      ? 1
                      : ANIMATION_CONFIG.scale.hover,
                  }}
                  whileTap={{
                    scale: shouldReduceMotion ? 1 : ANIMATION_CONFIG.scale.tap,
                  }}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isActive && "scale-110"
                    )}
                  />
                  <span className="hidden sm:inline">{section.title}</span>
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-primary/10"
                      layoutId="activeSection"
                      transition={ANIMATION_CONFIG.spring}
                    />
                  )}
                </motion.a>
              );
            })}
          </div>
        </div>
      </motion.nav>
    );
  }
);

StickyNavigation.displayName = "StickyNavigation";

/**
 * Modern hero section with glassmorphism and animations
 */
const ModernHero = memo(() => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-background to-primary/5 p-8 md:p-12"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: ANIMATION_CONFIG.durations.slow }}
    >
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  rotate: [0, ANIMATION_CONFIG.rotation.background],
                  scale: [1, ANIMATION_CONFIG.scale.background, 1],
                }
          }
          className="-top-20 -right-20 absolute h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  rotate: [ANIMATION_CONFIG.rotation.background, 0],
                  scale: [
                    ANIMATION_CONFIG.scale.background,
                    1,
                    ANIMATION_CONFIG.scale.background,
                  ],
                }
          }
          className="-bottom-20 -left-20 absolute h-32 w-32 rounded-full bg-primary/5 blur-2xl"
          transition={{
            duration: 15,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      </div>

      <div className="relative z-10">
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 font-medium text-primary text-sm backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.9 }}
          transition={{ delay: 0.2 }}
        >
          <Sparkles className="h-4 w-4" />
          <span>Metro Station Finder</span>
        </motion.div>

        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 font-bold text-4xl text-foreground tracking-tight md:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.3 }}
        >
          About Our{" "}
          <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Mission
          </span>
        </motion.h1>

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-muted-foreground text-xl leading-relaxed md:text-2xl"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.4 }}
        >
          Empowering Dhaka's commuters with intelligent metro navigation,
          real-time fare calculations, and seamless travel planning.
        </motion.p>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            asChild
            className="group gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
          >
            <a href="#about">
              Learn More
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>
          <Button
            asChild
            className="group gap-2 border-primary/20 bg-background/50 backdrop-blur-sm hover:bg-primary/5"
            size="lg"
            variant="outline"
          >
            <a
              href="https://github.com/tashfiqul-islam/metro-station-finder"
              rel="noopener noreferrer"
              target="_blank"
            >
              <SiGithub className="h-4 w-4" />
              View Source
            </a>
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );
});

ModernHero.displayName = "ModernHero";

/**
 * Renders a modern feature card with micro-interactions
 */
const FeatureCard = memo(
  ({
    feature,
    index,
  }: {
    readonly feature: Feature;
    readonly index: number;
  }) => {
    const Icon = feature.icon;
    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="group"
        initial={{ opacity: 0, y: 20 }}
        transition={{
          delay: index * ANIMATION_CONFIG.stagger,
          duration: ANIMATION_CONFIG.durations.normal,
        }}
        whileHover={{
          y: shouldReduceMotion ? 0 : ANIMATION_CONFIG.hover.y,
          transition: { duration: 0.2 },
        }}
      >
        <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 group-hover:border-primary/30 group-hover:bg-card/80 group-hover:shadow-lg">
          <CardContent className="flex gap-4 p-6">
            <motion.div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary/20 group-hover:to-primary/10"
              whileHover={{
                rotate: shouldReduceMotion ? 0 : ANIMATION_CONFIG.rotation.icon,
                transition: { duration: 0.2 },
              }}
            >
              <Icon
                aria-hidden="true"
                className="h-6 w-6 text-primary transition-colors duration-300 group-hover:text-primary/80"
              />
            </motion.div>
            <div className="flex-1">
              <h3 className="mb-2 font-semibold text-foreground text-lg transition-colors duration-300 group-hover:text-primary">
                {feature.name}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

FeatureCard.displayName = "FeatureCard";

/**
 * Renders a modern data source card with glassmorphism
 */
const DataSourceCard = memo(
  ({
    source,
    index,
  }: {
    readonly source: DataSource;
    readonly index: number;
  }) => {
    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="group"
        initial={{ opacity: 0, y: 20 }}
        transition={{
          delay: index * ANIMATION_CONFIG.stagger,
          duration: ANIMATION_CONFIG.durations.normal,
        }}
        whileHover={{
          y: shouldReduceMotion ? 0 : -2,
          transition: { duration: 0.2 },
        }}
      >
        <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 group-hover:border-primary/30 group-hover:bg-card/80 group-hover:shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary/20 group-hover:to-primary/10"
                whileHover={{
                  rotate: shouldReduceMotion
                    ? 0
                    : ANIMATION_CONFIG.rotation.icon,
                  transition: { duration: 0.2 },
                }}
              >
                <Database
                  aria-hidden="true"
                  className="h-5 w-5 text-primary transition-colors duration-300 group-hover:text-primary/80"
                />
              </motion.div>
              <span className="transition-colors duration-300 group-hover:text-primary">
                {source.name}
              </span>
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {source.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Badge
                className="w-fit bg-primary/10 text-primary transition-colors duration-300 hover:bg-primary/20"
                variant="secondary"
              >
                {source.license}
              </Badge>
              <Button
                asChild
                className="group/btn gap-2 border-primary/20 bg-background/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-primary/5"
                size="sm"
                variant="outline"
              >
                <a href={source.url} rel="noopener noreferrer" target="_blank">
                  Visit Site
                  <ExternalLink
                    aria-hidden="true"
                    className="group-hover/btn:-translate-y-0.5 h-3 w-3 transition-transform duration-300 group-hover/btn:translate-x-0.5"
                  />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

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
 * Modern about content component with enhanced UX and micro-interactions
 */
export function AboutContent() {
  const [activeSection, setActiveSection] = useState("about");
  const shouldReduceMotion = useReducedMotion();

  // Scroll to section on initial load if hash is present
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && SECTIONS.some((s) => s.id === hash)) {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveSection(hash);
      }
    }
  }, []);

  // Update URL hash and active section as user scrolls
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const handleIntersection = (id: string) => {
      if (SECTIONS.some((s) => s.id === id)) {
        setActiveSection(id);
        if (window.location.hash !== `#${id}`) {
          window.history.replaceState(null, "", `#${id}`);
        }
      }
    };

    const observerCallback: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          handleIntersection(entry.target.id);
        }
      }
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    for (const section of SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <main className="flex-1 pb-4 md:pb-16">
      <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-16">
          {/* Modern Hero Section */}
          <ModernHero />

          {/* Sticky Navigation */}
          <StickyNavigation activeSection={activeSection} sections={SECTIONS} />

          {/* About Section */}
          <motion.section
            className="scroll-mt-24 space-y-8"
            id="about"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: ANIMATION_CONFIG.durations.normal }}
            viewport={{ once: true, margin: "-100px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <motion.h2
                className="mb-4 font-bold text-4xl text-foreground tracking-tight md:text-5xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                About{" "}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Metro Station Finder
                </span>
              </motion.h2>
              <motion.p
                className="text-muted-foreground text-xl leading-relaxed md:text-2xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                Your comprehensive guide to navigating Dhaka's MRT-6 metro
                system
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="space-y-6 text-base text-muted-foreground leading-relaxed">
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
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <h3 className="mb-8 text-center font-semibold text-2xl text-foreground">
                Key Features
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                {FEATURES.map((feature, index) => (
                  <FeatureCard
                    feature={feature}
                    index={index}
                    key={feature.name}
                  />
                ))}
              </div>
            </motion.div>

            {/* Tech Stack */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.5 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <h3 className="mb-8 text-center font-semibold text-2xl text-foreground">
                Technology Stack
              </h3>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="grid gap-8 md:grid-cols-2">
                    <div>
                      <div className="mb-4 flex items-center gap-3 font-medium text-base">
                        <motion.div
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5"
                          whileHover={{
                            scale: shouldReduceMotion
                              ? 1
                              : ANIMATION_CONFIG.scale.icon,
                            transition: { duration: 0.2 },
                          }}
                        >
                          <Code
                            aria-hidden="true"
                            className="h-4 w-4 text-primary"
                          />
                        </motion.div>
                        Frontend
                      </div>
                      <ul className="space-y-2 text-muted-foreground text-sm">
                        {TECH_STACK.frontend.map((tech) => (
                          <li className="flex items-center gap-2" key={tech}>
                            <Zap className="h-3 w-3 text-primary" />
                            {tech}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-4 flex items-center gap-3 font-medium text-base">
                        <motion.div
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5"
                          whileHover={{
                            scale: shouldReduceMotion
                              ? 1
                              : ANIMATION_CONFIG.scale.icon,
                            transition: { duration: 0.2 },
                          }}
                        >
                          <Building2
                            aria-hidden="true"
                            className="h-4 w-4 text-primary"
                          />
                        </motion.div>
                        UI Components
                      </div>
                      <ul className="space-y-2 text-muted-foreground text-sm">
                        {TECH_STACK.ui.map((tech) => (
                          <li className="flex items-center gap-2" key={tech}>
                            <Zap className="h-3 w-3 text-primary" />
                            {tech}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-4 flex items-center gap-3 font-medium text-base">
                        <motion.div
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5"
                          whileHover={{
                            scale: shouldReduceMotion
                              ? 1
                              : ANIMATION_CONFIG.scale.icon,
                            transition: { duration: 0.2 },
                          }}
                        >
                          <MapPin
                            aria-hidden="true"
                            className="h-4 w-4 text-primary"
                          />
                        </motion.div>
                        Maps & Location
                      </div>
                      <ul className="space-y-2 text-muted-foreground text-sm">
                        {TECH_STACK.maps.map((tech) => (
                          <li className="flex items-center gap-2" key={tech}>
                            <Zap className="h-3 w-3 text-primary" />
                            {tech}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-4 flex items-center gap-3 font-medium text-base">
                        <motion.div
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5"
                          whileHover={{
                            scale: shouldReduceMotion
                              ? 1
                              : ANIMATION_CONFIG.scale.icon,
                            transition: { duration: 0.2 },
                          }}
                        >
                          <SiGithub
                            aria-hidden="true"
                            className="h-4 w-4 text-primary"
                          />
                        </motion.div>
                        Development Tools
                      </div>
                      <ul className="space-y-2 text-muted-foreground text-sm">
                        {TECH_STACK.tools.map((tech) => (
                          <li className="flex items-center gap-2" key={tech}>
                            <Zap className="h-3 w-3 text-primary" />
                            {tech}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.section>

          {/* Attribution Section */}
          <motion.section
            className="scroll-mt-24 space-y-8"
            id="attribution"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: ANIMATION_CONFIG.durations.normal }}
            viewport={{ once: true, margin: "-100px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <motion.h2
                className="mb-4 font-bold text-4xl text-foreground tracking-tight md:text-5xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                Data{" "}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Attribution
                </span>
              </motion.h2>
              <motion.p
                className="text-muted-foreground text-xl leading-relaxed md:text-2xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                Acknowledging our data sources and partners
              </motion.p>
            </div>

            <motion.div
              className="grid gap-6 md:grid-cols-2"
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              {DATA_SOURCES.map((source, index) => (
                <DataSourceCard
                  index={index}
                  key={source.name}
                  source={source}
                />
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm">
                <CardContent className="flex gap-4 p-8">
                  <motion.div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/20"
                    whileHover={{
                      scale: shouldReduceMotion
                        ? 1
                        : ANIMATION_CONFIG.scale.icon,
                      transition: { duration: 0.2 },
                    }}
                  >
                    <Info aria-hidden="true" className="h-6 w-6 text-primary" />
                  </motion.div>
                  <div className="space-y-3 text-base">
                    <p className="font-semibold text-foreground text-lg">
                      Important Notice
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
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
            </motion.div>
          </motion.section>

          {/* Privacy Section */}
          <motion.section
            className="scroll-mt-24 space-y-8"
            id="privacy"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: ANIMATION_CONFIG.durations.normal }}
            viewport={{ once: true, margin: "-100px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <motion.h2
                className="mb-4 font-bold text-4xl text-foreground tracking-tight md:text-5xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                Privacy{" "}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Policy
                </span>
              </motion.h2>
              <motion.p
                className="text-muted-foreground text-xl leading-relaxed md:text-2xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                How we protect and respect your privacy
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <motion.div
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5"
                      whileHover={{
                        scale: shouldReduceMotion
                          ? 1
                          : ANIMATION_CONFIG.scale.icon,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <Shield
                        aria-hidden="true"
                        className="h-6 w-6 text-primary"
                      />
                    </motion.div>
                    <span>Your Privacy Matters</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.1 }}
                    viewport={{ once: true }}
                    whileInView={{ opacity: 1, y: 0 }}
                  >
                    <h3 className="mb-4 font-semibold text-foreground text-xl">
                      Information We Collect
                    </h3>
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                          <MapPin className="h-4 w-4 text-primary" />
                          Location Data
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          When you use the "Use My Location" feature, your
                          browser provides approximate coordinates. This data is
                          processed locally and never sent to our servers.
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                          <Database className="h-4 w-4 text-primary" />
                          Search Queries
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Station searches are processed client-side and are not
                          stored or transmitted.
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                          <Eye className="h-4 w-4 text-primary" />
                          Usage Analytics
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          If diagnostics are enabled, we collect anonymous usage
                          statistics to improve the application. This respects
                          Do Not Track settings.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.2 }}
                    viewport={{ once: true }}
                    whileInView={{ opacity: 1, y: 0 }}
                  >
                    <h3 className="mb-4 font-semibold text-foreground text-xl">
                      How We Use Your Information
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        "Calculate distances and fares based on your location",
                        "Provide personalized station recommendations",
                        "Improve application performance and user experience",
                        "Debug issues and enhance features",
                      ].map((item, index) => (
                        <motion.div
                          className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3"
                          initial={{ opacity: 0, x: -20 }}
                          key={item}
                          transition={{
                            delay: index * ANIMATION_CONFIG.delay.stagger,
                          }}
                          viewport={{ once: true }}
                          whileInView={{ opacity: 1, x: 0 }}
                        >
                          <Zap className="h-4 w-4 flex-shrink-0 text-primary" />
                          <span className="text-muted-foreground text-sm">
                            {item}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.3 }}
                    viewport={{ once: true }}
                    whileInView={{ opacity: 1, y: 0 }}
                  >
                    <h3 className="mb-4 font-semibold text-foreground text-xl">
                      Third-Party Services
                    </h3>
                    <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
                      <div className="mb-3 flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span className="font-medium text-foreground">
                          Google Maps Platform
                        </span>
                      </div>
                      <p className="mb-3 text-muted-foreground text-sm leading-relaxed">
                        Map tiles and geolocation services are provided by
                        Google. Your usage is subject to{" "}
                        <a
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          href="https://policies.google.com/privacy"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Google's Privacy Policy
                        </a>
                        .
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.4 }}
                    viewport={{ once: true }}
                    whileInView={{ opacity: 1, y: 0 }}
                  >
                    <h3 className="mb-4 font-semibold text-foreground text-xl">
                      Your Rights
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        "Deny location permission at any time",
                        "Enable or disable diagnostics in the settings below",
                        "Use Do Not Track to automatically disable all tracking",
                        "Browse anonymously without creating an account",
                      ].map((right, index) => (
                        <motion.div
                          className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3"
                          initial={{ opacity: 0, x: -20 }}
                          key={right}
                          transition={{
                            delay: index * ANIMATION_CONFIG.delay.stagger,
                          }}
                          viewport={{ once: true }}
                          whileInView={{ opacity: 1, x: 0 }}
                        >
                          <Shield className="h-4 w-4 flex-shrink-0 text-primary" />
                          <span className="text-muted-foreground text-sm">
                            {right}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6"
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.5 }}
                    viewport={{ once: true }}
                    whileInView={{ opacity: 1, y: 0 }}
                  >
                    <p className="mb-2 font-semibold text-foreground text-lg">
                      Last Updated: December 2024
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      We are committed to protecting your privacy and will never
                      sell your personal information to third parties.
                    </p>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.section>

          {/* License Section */}
          <motion.section
            className="scroll-mt-24 space-y-8"
            id="license"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: ANIMATION_CONFIG.durations.normal }}
            viewport={{ once: true, margin: "-100px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <motion.h2
                className="mb-4 font-bold text-4xl text-foreground tracking-tight md:text-5xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                Open Source{" "}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  License
                </span>
              </motion.h2>
              <motion.p
                className="text-muted-foreground text-xl leading-relaxed md:text-2xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                This project is open source and available under the MIT License
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <motion.div
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5"
                      whileHover={{
                        scale: shouldReduceMotion
                          ? 1
                          : ANIMATION_CONFIG.scale.icon,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <Code
                        aria-hidden="true"
                        className="h-6 w-6 text-primary"
                      />
                    </motion.div>
                    <span>MIT License</span>
                  </CardTitle>
                  <CardDescription className="text-lg">
                    A permissive open source license that allows commercial use
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.1 }}
                    viewport={{ once: true }}
                    whileInView={{ opacity: 1, y: 0 }}
                  >
                    <h3 className="mb-4 font-semibold text-foreground text-xl">
                      What this means:
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        {
                          title: "Free to use",
                          desc: "Anyone can use this project for any purpose",
                        },
                        {
                          title: "Commercial use allowed",
                          desc: "Companies and organizations can use it in their products",
                        },
                        {
                          title: "Modification permitted",
                          desc: "You can modify and distribute the code",
                        },
                        {
                          title: "Attribution required",
                          desc: "You must include the original license and copyright notice",
                        },
                        {
                          title: "No warranty",
                          desc: 'The software is provided "as is" without any guarantees',
                        },
                      ].map((item, index) => (
                        <motion.div
                          className="rounded-lg border border-border/50 bg-muted/30 p-4"
                          initial={{ opacity: 0, y: 10 }}
                          key={item.title}
                          transition={{
                            delay: index * ANIMATION_CONFIG.delay.stagger,
                          }}
                          viewport={{ once: true }}
                          whileInView={{ opacity: 1, y: 0 }}
                        >
                          <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                            <Zap className="h-4 w-4 text-primary" />
                            {item.title}
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {item.desc}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.2 }}
                    viewport={{ once: true }}
                    whileInView={{ opacity: 1, y: 0 }}
                  >
                    <h3 className="mb-4 font-semibold text-foreground text-xl">
                      How to use this project:
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        {
                          title: "Fork the repository",
                          desc: "Make your own modifications",
                        },
                        {
                          title: "Use as a template",
                          desc: "For your own metro station finder apps",
                        },
                        {
                          title: "Contribute back",
                          desc: "Submit pull requests and issues",
                        },
                        {
                          title: "Deploy for your city",
                          desc: "Adapt the data and configuration",
                        },
                      ].map((item, index) => (
                        <motion.div
                          className="rounded-lg border border-border/50 bg-muted/30 p-4"
                          initial={{ opacity: 0, y: 10 }}
                          key={item.title}
                          transition={{
                            delay: index * ANIMATION_CONFIG.delay.stagger,
                          }}
                          viewport={{ once: true }}
                          whileInView={{ opacity: 1, y: 0 }}
                        >
                          <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                            <SiGithub className="h-4 w-4 text-primary" />
                            {item.title}
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {item.desc}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex flex-wrap gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.3 }}
                    viewport={{ once: true }}
                    whileInView={{ opacity: 1, y: 0 }}
                  >
                    <Badge
                      className="gap-2 bg-primary/10 text-primary hover:bg-primary/20"
                      variant="secondary"
                    >
                      <SiGithub className="h-3 w-3" />
                      Open Source
                    </Badge>
                    <Badge
                      className="gap-2 bg-primary/10 text-primary hover:bg-primary/20"
                      variant="secondary"
                    >
                      <Code className="h-3 w-3" />
                      MIT License
                    </Badge>
                    <Badge
                      className="gap-2 bg-primary/10 text-primary hover:bg-primary/20"
                      variant="secondary"
                    >
                      <Users className="h-3 w-3" />
                      Community Driven
                    </Badge>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm">
                <CardContent className="flex gap-4 p-8">
                  <motion.div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/20"
                    whileHover={{
                      scale: shouldReduceMotion
                        ? 1
                        : ANIMATION_CONFIG.scale.icon,
                      transition: { duration: 0.2 },
                    }}
                  >
                    <SiGithub
                      aria-hidden="true"
                      className="h-6 w-6 text-primary"
                    />
                  </motion.div>
                  <div className="space-y-3 text-base">
                    <p className="font-semibold text-foreground text-lg">
                      Full License Text
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      The complete MIT License text is available in the{" "}
                      <a
                        className="font-medium text-primary underline-offset-4 hover:underline"
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
            </motion.div>
          </motion.section>

          {/* Diagnostics Section */}
          <motion.section
            className="scroll-mt-24 space-y-8"
            id="diagnostics"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: ANIMATION_CONFIG.durations.normal }}
            viewport={{ once: true, margin: "-100px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <motion.h2
                className="mb-4 font-bold text-4xl text-foreground tracking-tight md:text-5xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                Diagnostics{" "}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Settings
                </span>
              </motion.h2>
              <motion.p
                className="text-muted-foreground text-xl leading-relaxed md:text-2xl"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                Control anonymous usage data collection
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <DiagnosticsSection />
            </motion.div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}
