import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StructuredData,
  StructuredDataGenerators,
} from "@/app/_components/shared/seo/structured-data";
import { MRT6_STATIONS } from "@/lib/services/data/stations";
import { generateMetadata as generateSEOMetadata } from "@/lib/services/seo/metadata";
import { StationPage } from "../_components/station-page";

/**
 * Generate static params for all station pages
 * This pre-generates all station pages at build time for optimal performance
 */
export function generateStaticParams() {
  return MRT6_STATIONS.map((station) => ({
    slug: station.id.replace("mrt-6-", ""),
  }));
}

/**
 * Generate metadata for each station page
 * This provides SEO-optimized metadata for each individual station
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const station = MRT6_STATIONS.find((s) => s.id.replace("mrt-6-", "") === slug);

  if (!station) {
    return generateSEOMetadata({
      title: "Station Not Found",
      description: "The requested metro station could not be found.",
    });
  }

  return generateSEOMetadata({
    title: `${station.name} Metro Station | MRT-6 Dhaka`,
    description: `Complete information about ${station.name} metro station on MRT-6. Find location, facilities, nearby attractions, and fare information.`,
    keywords: [
      `${station.name} metro`,
      `${station.name} station`,
      "MRT-6",
      "Dhaka metro",
      "metro station",
      "public transport",
      "Bangladesh metro",
    ],
  });
}

/**
 * Dynamic station page component
 * Uses Next.js dynamic segments for optimal routing and SEO
 */
export default async function StationPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const station = MRT6_STATIONS.find((s) => s.id.replace("mrt-6-", "") === slug);

  if (!station) {
    notFound();
  }

  return (
    <>
      {/* Station-specific JSON-LD Structured Data */}
      <StructuredData
        data={StructuredDataGenerators.transitStation(station.name, {
          description: `Metro station on MRT-6 line serving ${station.name} area in Dhaka`,
          address: `${station.name}, Dhaka, Bangladesh`,
          latitude: station.coordinates.lat,
          longitude: station.coordinates.lng,
          amenities: [
            "Accessibility Features",
            "Ticket Counter",
            "Security",
            "Waiting Area",
            "Restrooms",
            "Parking",
          ],
        })}
      />
      <StructuredData
        data={StructuredDataGenerators.breadcrumbList([
          { name: "Home", url: "https://metro-station-finder.vercel.app" },
          {
            name: "Station Finder",
            url: "https://metro-station-finder.vercel.app/station-finder",
          },
          {
            name: station.name,
            url: `https://metro-station-finder.vercel.app/station/${slug}`,
          },
        ])}
      />
      <StationPage station={station} />
    </>
  );
}
