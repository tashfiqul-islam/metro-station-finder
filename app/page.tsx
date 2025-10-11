import { Train } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { preconnect, prefetchDNS } from "react-dom";
import { Hero } from "@/components/hero/hero-section";
import { Navbar } from "@/components/navbar";
import { StructuredData } from "@/components/seo/structured-data";

// Preload critical external resources for better performance (React 19)
prefetchDNS("https://fonts.googleapis.com");
prefetchDNS("https://fonts.gstatic.com");
preconnect("https://fonts.googleapis.com");
preconnect("https://fonts.gstatic.com", { crossOrigin: "anonymous" });

/**
 * Metadata for the homepage - Next.js 15 App Router optimized
 * Follows 2025 SEO best practices with comprehensive metadata
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
    "metro navigation",
    "Dhaka transport",
  ],
  authors: [{ name: "Metro Station Finder Team" }],
  creator: "Metro Station Finder",
  publisher: "Metro Station Finder",
  openGraph: {
    title: "Metro Station Finder - Dhaka Metro Navigation Made Easy",
    description: "Find stations and calculate fares for Dhaka's metro system",
    type: "website",
    locale: "en_US",
    siteName: "Metro Station Finder",
  },
  twitter: {
    card: "summary_large_image",
    title: "Metro Station Finder - Dhaka Metro Navigation",
    description: "Find stations and calculate fares for Dhaka's metro system",
  },
  alternates: {
    canonical: "https://metro-station-finder.vercel.app",
  },
  other: {
    "application-name": "Metro Station Finder",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Metro Station Finder",
  },
};

/**
 * Homepage component - Next.js 15 App Router with React 19 optimizations
 * Features a full-viewport hero section with sticky header and footer
 * Implements modern 2025 web development best practices
 */
export default function HomePage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Structured Data for SEO - JSON-LD schema */}
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Metro Station Finder",
          description:
            "Find the nearest Dhaka metro station and calculate fares for MRT-6",
          url: "https://metro-station-finder.vercel.app",
          applicationCategory: "Transportation",
          operatingSystem: "Web Browser",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          author: {
            "@type": "Organization",
            name: "Metro Station Finder Team",
          },
          publisher: {
            "@type": "Organization",
            name: "Metro Station Finder",
          },
          potentialAction: [
            {
              "@type": "SearchAction",
              target:
                "https://metro-station-finder.vercel.app/station-finder?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          ],
        }}
      />

      {/* Navigation Header - Sticky positioning for optimal UX */}
      <header className="sticky top-0 z-50 shrink-0">
        <Navbar />
      </header>

      {/* Main Content - Flexbox for perfect viewport fitting */}
      <main className="flex-1 overflow-hidden">
        <Hero />
      </main>

      {/* Footer - Compact and accessible design */}
      <footer className="shrink-0 border-border/40 border-t bg-background/95 py-3 backdrop-blur-sm sm:py-4">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:gap-3">
            {/* Brand Section */}
            <div className="flex items-center gap-2 text-muted-foreground text-xs transition-colors hover:text-foreground sm:text-sm">
              <Train
                aria-hidden="true"
                className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4"
              />
              <span className="font-medium">Metro Station Finder</span>
              <span aria-hidden="true">•</span>
              <span>Dhaka MRT-6</span>
            </div>

            {/* Footer Navigation */}
            <nav aria-label="Footer navigation" className="shrink-0">
              <ul className="flex gap-3 text-muted-foreground text-xs sm:gap-5 sm:text-sm">
                <li>
                  <Link
                    className="inline-block transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    href="/about"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    className="inline-block transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    href="/about#privacy"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    className="inline-block transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
