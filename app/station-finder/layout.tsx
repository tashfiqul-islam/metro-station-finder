import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Station Finder | Find Dhaka Metro Stations Near You",
  description:
    "Find the nearest Dhaka metro station from your location. Search stations by name, use interactive maps, and get walking directions to MRT-6 stations.",
  keywords: [
    "metro station finder",
    "dhaka metro",
    "MRT-6",
    "station search",
    "metro map",
    "public transport",
    "bangladesh metro",
  ],
  openGraph: {
    title: "Station Finder - Find Dhaka Metro Stations",
    description:
      "Discover the nearest metro station with interactive maps and search",
    type: "website",
  },
  alternates: {
    canonical: "https://metro-station-finder.vercel.app/station-finder",
  },
};

export default function StationFinderLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return children;
}
