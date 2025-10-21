import type { Metadata } from "next";
import {
  StructuredData,
  StructuredDataGenerators,
} from "@/app/_components/shared/seo/structured-data";
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
  return (
    <>
      {/* Fare Calculator specific JSON-LD Structured Data */}
      <StructuredData
        data={StructuredDataGenerators.breadcrumbList([
          { name: "Home", url: "https://metro-station-finder.vercel.app" },
          {
            name: "Fare Calculator",
            url: "https://metro-station-finder.vercel.app/fare-calculator",
          },
        ])}
      />
      <StructuredData
        data={StructuredDataGenerators.howTo("How to Calculate Metro Fare", [
          {
            name: "Select Origin Station",
            text: "Choose your starting metro station from the dropdown or search by name.",
          },
          {
            name: "Select Destination Station",
            text: "Choose your destination metro station from the dropdown or search by name.",
          },
          {
            name: "Choose Ticket Type",
            text: "Select from single journey, return ticket, or daily pass options.",
          },
          {
            name: "Apply Discounts",
            text: "If applicable, select student, senior citizen, or other discount categories.",
          },
          {
            name: "View Fare Details",
            text: "See the calculated fare with breakdown of base fare, discounts, and total cost.",
          },
        ])}
      />
      <StructuredData
        data={StructuredDataGenerators.faq([
          {
            question: "How accurate are the fare calculations?",
            answer:
              "Our fare calculations are based on the official Dhaka Metro MRT-6 fare structure and are updated regularly to ensure accuracy.",
          },
          {
            question: "What types of tickets are available?",
            answer:
              "The metro offers single journey tickets, return tickets, and various pass options. Student and senior citizen discounts are also available.",
          },
          {
            question: "How do I pay for metro tickets?",
            answer:
              "Metro tickets can be purchased using contactless payment methods, mobile apps, or at station ticket counters.",
          },
        ])}
      />
      <FareCalculator />
    </>
  );
}
