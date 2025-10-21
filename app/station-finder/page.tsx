import { Suspense } from "react";
import {
  StructuredData,
  StructuredDataGenerators,
} from "@/app/_components/shared/seo/structured-data";
import { StationFinderContent } from "./_components/station-finder-content";

/**
 * Station Finder page (Next.js 16 with static export).
 * Note: Using client-side searchParams handling for static export compatibility.
 */
export default function StationFinderPage() {
  return (
    <>
      {/* Station Finder specific JSON-LD Structured Data */}
      <StructuredData
        data={StructuredDataGenerators.breadcrumbList([
          { name: "Home", url: "https://metro-station-finder.vercel.app" },
          {
            name: "Station Finder",
            url: "https://metro-station-finder.vercel.app/station-finder",
          },
        ])}
      />
      <StructuredData
        data={StructuredDataGenerators.faq([
          {
            question: "How do I search for a metro station?",
            answer:
              "Type the station name or your location in the search box. The app will show you nearby metro stations with real-time information.",
          },
          {
            question: "Can I see station details on the map?",
            answer:
              "Yes, click on any station marker on the map to see detailed information including amenities, operating hours, and accessibility features.",
          },
          {
            question: "How accurate is the station location data?",
            answer:
              "Our station locations are verified and updated regularly to ensure accuracy for navigation and planning.",
          },
        ])}
      />
      <Suspense
        fallback={<div className="flex min-h-dvh items-center justify-center">Loading...</div>}
      >
        <StationFinderContent />
      </Suspense>
    </>
  );
}
