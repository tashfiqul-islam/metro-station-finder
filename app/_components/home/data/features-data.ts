import { Calculator, Clock, MapPin, Shield } from "lucide-react";

/**
 * Features data for the features section
 */
export const FEATURES_DATA = [
  {
    icon: MapPin,
    title: "Station Finder",
    description: "Locate the nearest metro station with GPS precision and real-time availability.",
    href: "/station-finder",
  },
  {
    icon: Calculator,
    title: "Fare Calculator",
    description: "Calculate exact fares between any two stations with transparent pricing.",
    href: "/fare-calculator",
  },
  {
    icon: Clock,
    title: "Real-time Info",
    description: "Get live updates on station status, delays, and service announcements.",
    href: "/about",
  },
  {
    icon: Shield,
    title: "Accessibility",
    description: "Designed for everyone with full screen reader and keyboard navigation support.",
    href: "/about",
  },
] as const;
