import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fare Calculator | Calculate Dhaka Metro Fares",
  description:
    "Calculate metro fares between Dhaka MRT-6 stations. Get accurate fare estimates, travel time, and ticket type discounts for your journey.",
  keywords: [
    "metro fare calculator",
    "dhaka metro fares",
    "MRT-6 fares",
    "metro ticket prices",
    "fare calculation",
    "metro journey cost",
    "bangladesh metro fares",
  ],
  openGraph: {
    title: "Fare Calculator - Calculate Metro Fares",
    description:
      "Get accurate fare estimates and travel information for your metro journey",
    type: "website",
  },
  alternates: {
    canonical: "https://metro-station-finder.vercel.app/fare-calculator",
  },
};

export default function FareCalculatorLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <div className="min-h-full">{children}</div>;
}
