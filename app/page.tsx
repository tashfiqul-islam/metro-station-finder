import {
  ArrowRight,
  Calculator,
  MapPin,
  Navigation,
  Search,
  Train,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StationErrorBoundary } from "@/components/error/station-error-boundary";
import { Navbar } from "@/components/navbar";
import { StationListSuspense } from "@/components/suspense/station-list-suspense";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOperationalStations } from "@/lib/data/stations";
import { cn } from "@/lib/utils";

/**
 * Metadata for the homepage.
 * Optimized for SEO and social sharing.
 */
export const metadata: Metadata = {
  title: "Metro Station Finder | Find Dhaka Metro Stations & Calculate Fares",
  description:
    "Discover the nearest Dhaka metro station from your location and calculate fares between stations. Fast, accessible, and easy to use.",
  keywords: [
    "Dhaka metro",
    "metro station",
    "MRT-6",
    "fare calculator",
    "public transport",
    "Bangladesh metro",
  ],
  openGraph: {
    title: "Metro Station Finder - Dhaka Metro Navigation Made Easy",
    description: "Find stations and calculate fares for Dhaka's metro system",
    type: "website",
  },
};

/**
 * Homepage component showcasing the Metro Station Finder application.
 * Features hero section, quick actions, and featured stations.
 */
export default function HomePage() {
  // Get featured stations (popular locations)
  const allStations = getOperationalStations();
  const featuredStations = allStations.filter((station) =>
    ["farmgate", "mirpur-10", "motijheel"].includes(station.id)
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section
          aria-labelledby="hero-title"
          className="relative overflow-hidden border-border/40 border-b bg-gradient-to-br from-background via-background to-accent/5"
        >
          <div className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge */}
              <Badge
                className="mb-4 bg-primary/10 text-primary text-xs hover:bg-primary/20"
                variant="secondary"
              >
                <Train aria-hidden="true" className="mr-1 h-3 w-3" />
                MRT-6 Line - 16 Operational Stations
              </Badge>

              {/* Hero Title */}
              <h1
                className="mb-6 font-bold text-4xl text-foreground tracking-tight sm:text-5xl md:text-6xl"
                id="hero-title"
              >
                Find Your Nearest{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Metro Station
                </span>
              </h1>

              {/* Hero Description */}
              <p className="mb-8 text-balance text-lg text-muted-foreground sm:text-xl">
                Navigate Dhaka's metro system with ease. Find nearby stations,
                calculate fares, and plan your journey—all in one place.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild className="w-full sm:w-auto" size="lg">
                  <Link href="/station-finder">
                    <Search aria-hidden="true" className="mr-2 h-5 w-5" />
                    Find Stations
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </Button>

                <Button
                  asChild
                  className="w-full sm:w-auto"
                  size="lg"
                  variant="outline"
                >
                  <Link href="/fare-calculator">
                    <Calculator aria-hidden="true" className="mr-2 h-5 w-5" />
                    Calculate Fare
                  </Link>
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-8">
                <div className="rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
                  <div className="font-bold text-2xl text-primary sm:text-3xl">
                    16
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Active Stations
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
                  <div className="font-bold text-2xl text-primary sm:text-3xl">
                    ৳20-100
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Fare Range
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
                  <div className="font-bold text-2xl text-primary sm:text-3xl">
                    40min
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Full Line Time
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Background Elements */}
          <div
            aria-hidden="true"
            className="-z-10 pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden opacity-30"
          >
            <div className="-top-1/2 -right-1/4 absolute h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
            <div className="-bottom-1/2 -left-1/4 absolute h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          </div>
        </section>

        {/* Quick Actions */}
        <section
          aria-labelledby="quick-actions-title"
          className="border-border/40 border-b bg-background py-16 sm:py-24"
        >
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2
                className="mb-4 font-bold text-3xl text-foreground sm:text-4xl"
                id="quick-actions-title"
              >
                Quick Actions
              </h2>
              <p className="text-balance text-muted-foreground">
                Choose what you'd like to do
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
              {/* Station Finder Card */}
              <Card
                className={cn(
                  "group relative overflow-hidden rounded-xl border-border/50 bg-card/50 backdrop-blur-sm",
                  "hover:-translate-y-1 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                )}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin
                      aria-hidden="true"
                      className="h-6 w-6 text-primary"
                    />
                  </div>
                  <CardTitle className="text-xl">
                    Find Nearest Station
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-muted-foreground">
                    Use your current location or search for an address to find
                    the closest metro station with walking directions.
                  </p>
                  <Button asChild className="w-full" variant="default">
                    <Link href="/station-finder">
                      <Navigation aria-hidden="true" className="mr-2 h-4 w-4" />
                      Find Stations
                      <ArrowRight
                        aria-hidden="true"
                        className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                  </Button>
                </CardContent>

                {/* Hover Effect Overlay */}
                <div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent",
                    "opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  )}
                />
              </Card>

              {/* Fare Calculator Card */}
              <Card
                className={cn(
                  "group relative overflow-hidden rounded-xl border-border/50 bg-card/50 backdrop-blur-sm",
                  "hover:-translate-y-1 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                )}
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Calculator
                      aria-hidden="true"
                      className="h-6 w-6 text-primary"
                    />
                  </div>
                  <CardTitle className="text-xl">Calculate Fare</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-muted-foreground">
                    Select origin and destination stations to calculate your
                    fare, view route details, and see travel time estimates.
                  </p>
                  <Button asChild className="w-full" variant="default">
                    <Link href="/fare-calculator">
                      <Calculator aria-hidden="true" className="mr-2 h-4 w-4" />
                      Calculate Fare
                      <ArrowRight
                        aria-hidden="true"
                        className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                  </Button>
                </CardContent>

                {/* Hover Effect Overlay */}
                <div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent",
                    "opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  )}
                />
              </Card>
            </div>
          </div>
        </section>

        {/* Featured Stations with React 19 Server Components */}
        {featuredStations.length > 0 && (
          <section
            aria-labelledby="featured-stations-title"
            className="bg-background py-16 sm:py-24"
          >
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-12 text-center">
                <h2
                  className="mb-4 font-bold text-3xl text-foreground sm:text-4xl"
                  id="featured-stations-title"
                >
                  Popular Stations
                </h2>
                <p className="text-balance text-muted-foreground">
                  Explore some of the busiest stations on the MRT-6 line
                </p>
              </div>

              {/* React 19 Server Component with Suspense */}
              <StationErrorBoundary>
                <StationListSuspense />
              </StationErrorBoundary>

              <div className="mt-12 text-center">
                <Button asChild size="lg" variant="outline">
                  <Link href="/station-finder">
                    View All Stations
                    <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-border/40 border-t bg-background py-8">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Train aria-hidden="true" className="h-4 w-4 text-primary" />
              <span>Metro Station Finder</span>
              <span>•</span>
              <span>Dhaka MRT-6</span>
            </div>

            <nav aria-label="Footer navigation">
              <ul className="flex gap-6 text-muted-foreground text-sm">
                <li>
                  <Link
                    className="transition-colors hover:text-foreground"
                    href="/about"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    className="transition-colors hover:text-foreground"
                    href="/about#privacy"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    className="transition-colors hover:text-foreground"
                    href="/about#attribution"
                  >
                    Attribution
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
