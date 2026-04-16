import { createFileRoute, Link } from "@tanstack/react-router";
import { generateHeadConfig } from "@/lib/head-meta";
import {
  BookOpen,
  Database,
  Eye,
  FileText,
  Heart,
  Info,
  Lock,
  MapPin,
  Shield,
  Sparkle,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { SectionWrapper } from "@/components/common/section-wrapper";
import { UnifiedBackground } from "@/components/common/unified-background";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * World-class 2025 About page redesign
 * Features modern design, proper dark/light mode, improved tab highlighting, and accordion FAQs
 */
export const About = () => {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch during SSR
  if (!mounted) {
    return <div className="min-h-screen" />;
  }

  const featureCards = [
    {
      description: "17 stations across Dhaka's MRT-6 metro line, from Uttara North to Kamalapur.",
      icon: MapPin,
      iconBg: "bg-linear-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400",
      title: "Coverage",
    },
    {
      description: "Official DMTCL fare matrix and station data, validated and kept up-to-date.",
      icon: Database,
      iconBg: "bg-linear-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400",
      title: "Data Source",
    },
    {
      description: "Built with modern web technologies, fully transparent and community-driven.",
      icon: Sparkle,
      iconBg: "bg-linear-to-r from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400",
      title: "Open Source",
    },
  ];

  const sections = [
    {
      description: "Understanding how Metro Station Finder operates and serves you",
      icon: Info,
      id: "how-it-works",
      items: [
        {
          content:
            "Use the Station Finder tool to search by name or location. The app uses your browser's geolocation (with permission) or MapLibre integration to help you find the nearest metro station. All searches happen locally in your browser—no data is sent to our servers.",
          trigger: "How do I find a station?",
          value: "how-it-works-1",
        },
        {
          content:
            "Fares are calculated using the official DMTCL fare matrix. Simply select your origin and destination stations, and the app instantly displays the fare in Bangladeshi Taka (BDT). The fare structure is based on distance between stations and follows the official pricing tiers (0, 20, 30, 40, 50, 60, 70, 80, 90, 100 BDT).",
          trigger: "How is the fare calculated?",
          value: "how-it-works-2",
        },
        {
          content:
            "No! Metro Station Finder is completely free to use and requires no account creation, login, or registration. Simply visit the website and start using it immediately. All features are available without any barriers.",
          trigger: "Do I need to create an account?",
          value: "how-it-works-3",
        },
        {
          content:
            "Yes! The app is designed to work offline. Station data and fare information are bundled with the application, so you can search stations and calculate fares even without an internet connection. Map features require internet connectivity for MapLibre integration.",
          trigger: "Is there an offline mode?",
          value: "how-it-works-4",
        },
      ],
      title: "How It Works",
    },
    {
      description: "Your privacy is our priority. Here's how we protect your data.",
      icon: Shield,
      id: "privacy",
      items: [
        {
          content: (
            <>
              <p className="mb-3 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                <strong className="text-foreground">We collect minimal data:</strong>
              </p>
              <ul className="list-inside list-disc space-y-2 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                <li>
                  <strong className="text-foreground">No personal information:</strong> We don't
                  collect names, emails, phone numbers, or any personally identifiable information.
                </li>
                <li>
                  <strong className="text-foreground">No tracking:</strong> We don't use cookies,
                  analytics trackers, or third-party tracking services.
                </li>
                <li>
                  <strong className="text-foreground">Location data:</strong> Only used locally in
                  your browser when you grant permission. Never sent to our servers.
                </li>
                <li>
                  <strong className="text-foreground">Browser storage:</strong> May store
                  preferences locally (theme, language) for your convenience.
                </li>
              </ul>
            </>
          ),
          trigger: "What data do you collect?",
          value: "privacy-1",
        },
        {
          content: (
            <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
              Location data is only requested when you use the "Find Nearest Station" feature. This
              data stays entirely in your browser and is used solely to calculate distances to metro
              stations. We never receive, store, or transmit your location data. If you don't grant
              location permission, you can still use all other features of the app.
            </p>
          ),
          trigger: "How is my location data used?",
          value: "privacy-2",
        },
        {
          content: (
            <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
              No. Metro Station Finder does not use cookies, tracking pixels, analytics services, or
              any form of user tracking. We don't integrate with Google Analytics, Facebook Pixel,
              or any other tracking services. Your browsing activity remains completely private.
            </p>
          ),
          trigger: "Do you use cookies or tracking?",
          value: "privacy-3",
        },
        {
          content: (
            <>
              <p className="mb-3 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                The app uses MapLibre for map visualization and geocoding. When you use map
                features:
              </p>
              <ul className="list-inside list-disc space-y-2 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                <li>MapLibre may collect data according to their privacy policy</li>
                <li>We don't have access to or control over Google's data collection</li>
                <li>You can use the app without maps if you prefer</li>
              </ul>
              <p className="mt-3 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                For details, see{" "}
                <a
                  className="text-primary hover:underline"
                  href="https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Google's Privacy Policy
                </a>
                .
              </p>
            </>
          ),
          trigger: "Third-party services",
          value: "privacy-4",
        },
      ],
      title: "Privacy Policy",
    },
    {
      description: "Information about the data we use and how we maintain accuracy",
      icon: Database,
      id: "data",
      items: [
        {
          content: (
            <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
              All station information (names, locations, coordinates) and fare data are sourced from
              official DMTCL (Dhaka Mass Transit Company Limited) publications and verified against
              official sources. The data is manually curated and validated to ensure accuracy.
            </p>
          ),
          trigger: "Where does the station data come from?",
          value: "data-1",
        },
        {
          content: (
            <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
              We update station and fare data whenever official changes are announced by DMTCL. The
              fare matrix revision date is displayed in the fare calculator. If you notice outdated
              information, please report it via our GitHub repository.
            </p>
          ),
          trigger: "How often is the data updated?",
          value: "data-2",
        },
        {
          content: (
            <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
              Fare calculations are based on the official DMTCL fare matrix. However, fares may
              change without notice, and we cannot guarantee 100% accuracy at all times. Always
              verify fares at the station before traveling. This app is provided "as-is" for
              informational purposes only.
            </p>
          ),
          trigger: "Is the fare information accurate?",
          value: "data-3",
        },
        {
          content: (
            <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
              Yes! The project is MIT licensed, which means you're free to use, modify, and
              distribute the code and data. However, please note that station and fare data may be
              subject to DMTCL's terms of use. Always verify licensing requirements for official
              transit data.
            </p>
          ),
          trigger: "Can I use this data in my own project?",
          value: "data-4",
        },
      ],
      title: "Data Usage & Accuracy",
    },
    {
      customContent: true,
      description: "Open source license information and legal disclaimers",
      icon: FileText,
      id: "license",
      title: "License & Legal",
    },
    {
      description: "Our commitment to accessibility and web standards compliance",
      icon: BookOpen,
      id: "compliance",
      items: [
        {
          content: (
            <>
              <p className="mb-3 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                We strive to make Metro Station Finder accessible to everyone:
              </p>
              <ul className="list-inside list-disc space-y-2 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                <li>WCAG 2.1 Level AA compliance target</li>
                <li>Keyboard navigation support</li>
                <li>Screen reader compatibility</li>
                <li>High contrast mode support</li>
                <li>Reduced motion preferences respected</li>
                <li>Semantic HTML structure</li>
              </ul>
            </>
          ),
          trigger: "Accessibility Standards",
          value: "compliance-1",
        },
        {
          content: (
            <>
              <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                While this is a free, non-commercial project, we follow privacy best practices:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-2 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                <li>
                  <strong className="text-foreground">No data collection:</strong> We don't collect
                  personal data, so GDPR data subject rights don't apply
                </li>
                <li>
                  <strong className="text-foreground">Transparency:</strong> All data usage is
                  clearly documented
                </li>
                <li>
                  <strong className="text-foreground">User control:</strong> You control all data
                  (location permissions, browser storage)
                </li>
                <li>
                  <strong className="text-foreground">No cookies:</strong> We don't use cookies, so
                  no cookie consent is required
                </li>
              </ul>
            </>
          ),
          trigger: "GDPR & Privacy Compliance",
          value: "compliance-2",
        },
        {
          content: (
            <>
              <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                Metro Station Finder works on all modern browsers:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                <li>Chrome/Edge (latest 2 versions)</li>
                <li>Firefox (latest 2 versions)</li>
                <li>Safari (latest 2 versions)</li>
                <li>Mobile browsers (iOS Safari, Chrome Mobile)</li>
              </ul>
              <p className="mt-3 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                The app uses modern web standards and may not work on very old browsers. We
                recommend keeping your browser updated for the best experience.
              </p>
            </>
          ),
          trigger: "Browser Compatibility",
          value: "compliance-3",
        },
      ],
      title: "Compliance & Accessibility",
    },
  ];

  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />

      {/* Feature Cards Section - Now the hero */}
      <SectionWrapper id="about-features" snapAlign="start">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          {/* Section Header */}
          <div className="mb-12 text-center sm:mb-16 lg:mb-20">
            <h1 className="mb-4 font-extrabold text-3xl text-foreground tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              About{" "}
              <span
                className="bg-clip-text font-extrabold text-transparent"
                style={{
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  backgroundImage:
                    "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 50%, hsl(var(--primary)) 100%)",
                }}
              >
                Metro Station Finder
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg lg:text-xl">
              A free, open-source passion project helping commuters navigate Dhaka's MRT-6 metro
              network with precision and ease.
            </p>
          </div>

          {/* Badges */}
          <div className="mb-12 flex flex-wrap items-center justify-center gap-3 sm:mb-16">
            <motion.div
              whileHover={shouldReduceMotion ? {} : { scale: 1.05, y: -2 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            >
              <Badge
                className="bg-primary/15 text-primary shadow-sm dark:bg-primary/25 dark:text-primary"
                variant="secondary"
              >
                <Heart className="mr-1.5 h-3.5 w-3.5" />
                MIT Licensed
              </Badge>
            </motion.div>
            <motion.div
              whileHover={shouldReduceMotion ? {} : { scale: 1.05, y: -2 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            >
              <Badge
                className="border-border/60 bg-background/80 text-sm backdrop-blur-sm dark:border-border/40 dark:bg-background/60"
                variant="outline"
              >
                <Lock className="mr-1.5 h-3.5 w-3.5" />
                100% Free
              </Badge>
            </motion.div>
            <motion.div
              whileHover={shouldReduceMotion ? {} : { scale: 1.05, y: -2 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            >
              <Badge
                className="border-border/60 bg-background/80 text-sm backdrop-blur-sm dark:border-border/40 dark:bg-background/60"
                variant="outline"
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                No Tracking
              </Badge>
            </motion.div>
            <motion.div
              whileHover={shouldReduceMotion ? {} : { scale: 1.05, y: -2 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            >
              <Badge
                className="border-border/60 bg-background/80 text-sm backdrop-blur-sm dark:border-border/40 dark:bg-background/60"
                variant="outline"
              >
                <Shield className="mr-1.5 h-3.5 w-3.5" />
                Privacy First
              </Badge>
            </motion.div>
          </div>

          {/* Feature Cards Grid with Glassmorphism */}
          <div className="mb-16 grid gap-6 sm:mb-20 sm:grid-cols-2 lg:mb-24 lg:grid-cols-3">
            {featureCards.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  style={{
                    willChange: shouldReduceMotion ? "auto" : "transform",
                  }}
                  whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -4 }}
                >
                  <div
                    className="group relative h-full overflow-hidden rounded-2xl border border-white/17 backdrop-blur-[5.7px] transition-all duration-300 hover:border-primary/40 hover:shadow-xl dark:border-white/10 dark:bg-black/30 dark:backdrop-blur-2xl dark:hover:border-primary/30"
                    style={{
                      WebkitBackdropFilter: "blur(5.7px)",
                      backgroundColor: "rgba(255, 255, 255, 0.19)",
                      boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-primary/5 dark:via-transparent dark:to-primary/10 dark:opacity-50" />

                    {/* Content */}
                    <div className="relative flex h-full flex-col p-6 sm:p-8">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16">
                        <div
                          className={cn(
                            "flex h-full w-full items-center justify-center rounded-xl",
                            item.iconBg,
                          )}
                        >
                          <Icon className="h-7 w-7 text-white sm:h-8 sm:w-8" />
                        </div>
                      </div>
                      <h3 className="mb-3 font-bold text-foreground text-xl sm:text-2xl">
                        {item.title}
                      </h3>
                      <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Modern Tabs Section - Rounded Rectangular Design */}
          <div className="space-y-8">
            <Tabs className="w-full" defaultValue="how-it-works">
              <TabsList className="mb-8 flex w-full flex-wrap gap-2 border-0 bg-transparent p-0 lg:flex-nowrap">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <TabsTrigger
                      className="h-10 rounded-lg border border-border/40 bg-muted/30 px-4 py-2 font-medium text-muted-foreground text-sm transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:border-primary/40 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:border-border/30 dark:bg-muted/20 dark:data-[state=active]:border-primary/50 dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground dark:data-[state=active]:shadow-md dark:hover:bg-muted/30"
                      key={section.id}
                      value={section.id}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">{section.title}</span>
                      <span className="sm:hidden">{section.title.split(" ")[0]}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <TabsContent key={section.id} value={section.id}>
                    <div
                      className="group relative overflow-hidden rounded-2xl border border-white/17 backdrop-blur-[5.7px] transition-all duration-300 dark:border-white/10 dark:bg-black/30 dark:backdrop-blur-2xl"
                      style={{
                        WebkitBackdropFilter: "blur(5.7px)",
                        backgroundColor: "rgba(255, 255, 255, 0.19)",
                        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 dark:from-primary/5 dark:via-transparent dark:to-primary/10 dark:opacity-50" />

                      {/* Content */}
                      <div className="relative p-6 sm:p-8">
                        <div className="mb-6 flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 shadow-lg sm:h-14 sm:w-14 dark:bg-primary/25">
                            <Icon className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
                          </div>
                          <div className="flex-1">
                            <h2 className="mb-2 font-bold text-2xl text-foreground sm:text-3xl lg:text-4xl">
                              {section.title}
                            </h2>
                            <p className="font-normal text-base text-muted-foreground sm:text-lg">
                              {section.description}
                            </p>
                          </div>
                        </div>

                        {section.customContent ? (
                          <div className="space-y-6">
                            <div>
                              <h3 className="mb-3 font-semibold text-foreground text-xl sm:text-2xl">
                                MIT License
                              </h3>
                              <p className="mb-4 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                                Metro Station Finder is released under the MIT License. This means
                                you are free to:
                              </p>
                              <ul className="mb-4 list-inside list-disc space-y-1 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                                <li>Use the software for any purpose</li>
                                <li>Modify and adapt the code</li>
                                <li>Distribute the software</li>
                                <li>Sublicense the software</li>
                              </ul>
                              <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                                The only requirement is to include the original license and
                                copyright notice. See the{" "}
                                <a
                                  className="text-primary hover:underline"
                                  href="https://github.com/tashfiqul-islam/metro-station-finder/blob/main/LICENSE"
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  full license text
                                </a>{" "}
                                for details.
                              </p>
                            </div>
                            <Separator className="bg-border/50 dark:bg-border/30" />
                            <div>
                              <h3 className="mb-2 font-semibold text-foreground text-xl sm:text-2xl">
                                Disclaimer
                              </h3>
                              <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                                This application is provided "as-is" without any warranties. While
                                we strive for accuracy, we cannot guarantee that all information is
                                current or correct. Always verify fare information and station
                                details at the actual metro station before traveling. The developers
                                are not responsible for any losses or inconveniences resulting from
                                the use of this application.
                              </p>
                            </div>
                            <Separator className="bg-border/50 dark:bg-border/30" />
                            <div>
                              <h3 className="mb-2 font-semibold text-foreground text-xl sm:text-2xl">
                                Attribution
                              </h3>
                              <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                                Metro Station Finder is a passion project created by{" "}
                                <a
                                  className="text-primary hover:underline"
                                  href="https://github.com/tashfiqul-islam"
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  Tashfiqul Islam
                                </a>
                                . Built with modern web technologies including React, TypeScript,
                                TanStack Router, and Tailwind CSS.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Accordion className="w-full" multiple={false}>
                            {section.items?.map((item) => (
                              <AccordionItem
                                className="border-border/50 dark:border-border/30"
                                key={item.value}
                                id={item.value}
                              >
                                <AccordionTrigger className="font-semibold text-foreground text-lg hover:no-underline sm:text-xl">
                                  {item.trigger}
                                </AccordionTrigger>
                                <AccordionContent>
                                  {typeof item.content === "string" ? (
                                    <p className="font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                                      {item.content}
                                    </p>
                                  ) : (
                                    <div className="font-normal text-base sm:text-lg">
                                      {item.content}
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>

          {/* Modern CTA Section */}
          <div className="mt-16 text-center sm:mt-20 lg:mt-24">
            <div
              className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-linear-to-br from-primary/10 via-background/50 to-primary/5 backdrop-blur-xl transition-all duration-300 hover:border-primary/50 hover:shadow-xl dark:border-primary/40 dark:from-primary/15 dark:via-background/30 dark:to-primary/10 dark:backdrop-blur-2xl"
              style={{
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div className="relative p-8 sm:p-12">
                <div className="mb-6 flex items-center justify-center gap-3">
                  <Heart className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
                  <h3 className="font-bold text-2xl text-foreground sm:text-3xl">
                    Contribute & Support
                  </h3>
                </div>
                <p className="mb-8 font-normal text-base text-muted-foreground leading-relaxed sm:text-lg">
                  This is a passion project. Your contributions make it better! Found a bug? Have a
                  feature idea? Want to improve the data? We welcome contributions!
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <motion.a
                    className="font-medium text-base text-primary hover:underline sm:text-lg"
                    href="https://github.com/tashfiqul-islam/metro-station-finder"
                    rel="noopener noreferrer"
                    target="_blank"
                    whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                  >
                    View on GitHub
                  </motion.a>
                  <span className="text-muted-foreground">•</span>
                  <motion.div
                    whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                  >
                    <Link
                      className="font-medium text-base text-primary hover:underline sm:text-lg"
                      to="/station-finder"
                    >
                      Start Using the App
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
};

export const Route = createFileRoute("/about")({
  component: About,
  head: () =>
    generateHeadConfig({
      description:
        "Learn about Metro Station Finder: how it works, privacy policy, data sources, licensing, and accessibility.",
      path: "/about",
      title: "About",
    }),
});
