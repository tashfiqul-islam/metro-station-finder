import { Calculator, Navigation } from "lucide-react";

/**
 * Hero section data configuration
 */
export const HERO_DATA = {
  badge: "Dhaka MRT-6 Navigation",
  title: "Navigate Dhaka's Metro with",
  titleHighlight: "Precision",
  description:
    "Find stations, calculate fares, and plan your journey across Dhaka's MRT-6 network—fast, accurate, and completely free.",
  cta: {
    primary: {
      text: "Find Station",
      href: "/station-finder",
      icon: Navigation,
    },
    secondary: {
      text: "Calculate Fare",
      href: "/fare-calculator",
      icon: Calculator,
    },
  },
} as const;
