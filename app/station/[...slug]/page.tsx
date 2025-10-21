import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MRT6_STATIONS } from "@/lib/services/data/stations";
import { generateMetadata as generateSEOMetadata } from "@/lib/services/seo/metadata";
import { StationPage } from "../_components/station-page";

/**
 * Generate static params for all station pages with catch-all segments
 * This handles both single station routes and nested station routes
 */
export function generateStaticParams() {
  const singleStationParams = MRT6_STATIONS.map((station) => ({
    slug: [station.id.replace("mrt-6-", "")],
  }));

  // Add some common nested routes for better SEO
  const nestedRoutes = [
    { slug: ["uttara-north", "facilities"] },
    { slug: ["motijheel", "directions"] },
    { slug: ["farmgate", "nearby"] },
  ];

  return [...singleStationParams, ...nestedRoutes];
}

/**
 * Generate metadata for station pages with catch-all segments
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stationSlug = slug[0];
  const station = MRT6_STATIONS.find((s) => s.id.replace("mrt-6-", "") === stationSlug);

  if (!station) {
    return generateSEOMetadata({
      title: "Station Not Found",
      description: "The requested metro station could not be found.",
    });
  }

  // Handle nested routes
  const subRoute = slug[1];
  let title = `${station.name} Metro Station | MRT-6 Dhaka`;
  let description = `Complete information about ${station.name} metro station on MRT-6.`;

  if (subRoute === "facilities") {
    title = `${station.name} Facilities | MRT-6 Dhaka`;
    description = `Station facilities and amenities available at ${station.name} metro station.`;
  } else if (subRoute === "directions") {
    title = `How to Reach ${station.name} | MRT-6 Dhaka`;
    description = `Directions and transportation options to reach ${station.name} metro station.`;
  } else if (subRoute === "nearby") {
    title = `Nearby Attractions - ${station.name} | MRT-6 Dhaka`;
    description = `Places of interest and attractions near ${station.name} metro station.`;
  }

  return generateSEOMetadata({
    title,
    description,
    keywords: [
      `${station.name} metro`,
      `${station.name} station`,
      "MRT-6",
      "Dhaka metro",
      "metro station",
      "public transport",
      "Bangladesh metro",
      ...(subRoute ? [subRoute] : []),
    ],
  });
}

/**
 * Catch-all station page component
 * Handles both single station routes and nested station routes
 */
export default async function CatchAllStationPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const stationSlug = slug[0];
  const station = MRT6_STATIONS.find((s) => s.id.replace("mrt-6-", "") === stationSlug);

  if (!station) {
    notFound();
  }

  return <StationPage station={station} />;
}
