import type { Metadata } from "next";
import {
  StructuredData,
  StructuredDataGenerators,
} from "@/app/_components/shared/seo/structured-data";
import { generateMetadata as generateSEOMetadata } from "@/lib/services/seo/metadata";
import { HomePage } from "./_components/home-page";

/**
 * Metadata for the home page - Next.js 16 App Router optimized
 * Follows 2025 SEO best practices with comprehensive metadata
 */
export const metadata: Metadata = generateSEOMetadata({
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
});

/**
 * Home page component - Next.js 16 App Router with React 19 optimizations
 * Features modern React patterns for optimal user experience
 */
export default function HomePageRoute() {
  return (
    <>
      {/* Page-specific JSON-LD Structured Data */}
      <StructuredData
        data={StructuredDataGenerators.faq([
          {
            question: "How do I find the nearest metro station?",
            answer:
              "Use our station finder tool to search by location or station name. The app will show you the closest metro station with directions and fare information.",
          },
          {
            question: "What are the metro operating hours?",
            answer: "Dhaka Metro operates from 6:00 AM to 10:00 PM daily, seven days a week.",
          },
          {
            question: "How much does a metro ride cost?",
            answer:
              "Metro fares range from 20-50 BDT depending on the distance traveled. Use our fare calculator to get exact pricing between stations.",
          },
          {
            question: "Is the metro accessible for people with disabilities?",
            answer:
              "Yes, all metro stations are equipped with accessibility features including elevators, ramps, and tactile guidance systems.",
          },
        ])}
      />
      <StructuredData
        data={StructuredDataGenerators.breadcrumbList([
          { name: "Home", url: "https://metro-station-finder.vercel.app" },
        ])}
      />
      <HomePage />
    </>
  );
}
