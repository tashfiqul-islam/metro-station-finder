import type { LucideIcon } from "lucide-react";

/**
 * Common types for home page components
 */

export type StatData = {
  readonly icon: LucideIcon;
  readonly value: string;
  readonly label: string;
  readonly description: string;
};

export type FeatureData = {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly href: string;
};

export type BenefitData = {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
};

export type TestimonialData = {
  readonly name: string;
  readonly role: string;
  readonly content: string;
  readonly rating: number;
};

export type CTAData = {
  readonly text: string;
  readonly href: string;
  readonly icon: LucideIcon;
};

export type HeroData = {
  readonly badge: string;
  readonly title: string;
  readonly titleHighlight: string;
  readonly description: string;
  readonly cta: {
    readonly primary: CTAData;
    readonly secondary: CTAData;
  };
};

export type CTAVariant = "primary" | "secondary";
