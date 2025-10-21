import { Calculator, Clock, MapPin } from "lucide-react";

/**
 * Stats data for the hero section
 */
export const STATS_DATA = [
  {
    icon: MapPin,
    value: "16",
    label: "Active Stations",
    description: "Across MRT-6",
  },
  {
    icon: Calculator,
    value: "৳20-100",
    label: "Fare Range",
    description: "Distance Based",
  },
  {
    icon: Clock,
    value: "~40min",
    label: "Full Line",
    description: "End to End",
  },
] as const;
