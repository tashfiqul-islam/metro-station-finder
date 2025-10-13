import type { Metadata } from "next";
import { preconnect, prefetchDNS } from "react-dom";
import { Hero } from "@/components/hero/hero-section";
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
    <>
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

      {/* Main Content - Hero Section */}
      <Hero />
    </>
  );
}
