import { Calculator, NavigationArrow } from "@phosphor-icons/react";

export const HERO_DATA = {
  badge: "Metro Station Finder",
  cta: {
    primary: {
      href: "/station-finder",
      icon: NavigationArrow,
      text: "Find Station",
    },
    secondary: {
      href: "/station-fares",
      icon: Calculator,
      text: "Calculate Fare",
    },
  },
  description:
    "Find stations, calculate fares, and plan your journey across Dhaka's metro station network—fast, accurate, and completely free.",
  title: "Navigate Dhaka's Metro with",
  titleHighlight: "Precision",
} as const;
