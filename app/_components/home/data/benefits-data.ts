import { Globe, Heart, Smartphone, Zap } from "lucide-react";

/**
 * Benefits data for the benefits section
 */
export const BENEFITS_DATA = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized for speed with instant search results and smooth animations.",
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    description: "Perfect experience on all devices with responsive design and touch optimization.",
  },
  {
    icon: Globe,
    title: "Offline Ready",
    description:
      "Works without internet connection for essential metro information and navigation.",
  },
  {
    icon: Heart,
    title: "Free Forever",
    description: "No ads, no subscriptions, no hidden costs. Built for the community.",
  },
] as const;
