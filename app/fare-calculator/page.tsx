import type { Metadata } from "next";
import { FareCalculator } from "./_components/fare-calculator";

export const metadata: Metadata = {
  title: "Fare Calculator | Metro Station Finder",
  description:
    "Calculate fares between metro stations. Instant fare lookup with multiple ticket types and real-time discount information.",
  openGraph: {
    title: "Fare Calculator | Metro Station Finder",
    description: "Calculate fares between metro stations with instant results.",
    type: "website",
  },
};

export default function FareCalculatorPage() {
  return <FareCalculator />;
}
