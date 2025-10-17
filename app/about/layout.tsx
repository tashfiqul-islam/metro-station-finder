import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Metro Station Finder - Dhaka MRT-6",
  description:
    "Learn about Metro Station Finder, the comprehensive guide to navigating Dhaka's MRT-6 metro system. Features, technology, privacy policy, and more.",
  keywords: [
    "about metro station finder",
    "dhaka metro app",
    "MRT-6 information",
    "metro app features",
    "privacy policy",
    "open source metro app",
    "bangladesh metro guide",
  ],
  openGraph: {
    title: "About Metro Station Finder",
    description:
      "Learn about our metro station finder app for Dhaka's MRT-6 system",
    type: "website",
  },
  alternates: {
    canonical: "https://metro-station-finder.vercel.app/about",
  },
};

export default function AboutLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <div className="min-h-full">{children}</div>;
}
