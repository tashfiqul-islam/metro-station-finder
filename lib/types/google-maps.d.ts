// Custom type definitions for Google Maps API to allow string values for numeric stylers
// This is necessary because the Google Maps API sometimes accepts string representations
// of numbers (e.g., "100", "-50") in map styles, but the default @types/google.maps
// expects numbers.

import type { MapTypeStyle as OriginalMapTypeStyle } from "@types/google.maps";

// Enhanced MapTypeStyle that allows string values for numeric properties
export type EnhancedMapTypeStyle = Omit<OriginalMapTypeStyle, "stylers"> & {
  stylers?: Array<{
    color?: string;
    gamma?: number | string;
    hue?: string;
    invertLightness?: boolean;
    lightness?: number | string;
    saturation?: number | string;
    visibility?: "on" | "off" | "simplified";
    weight?: number | string;
  }>;
};

// Module augmentation for Google Maps API
declare module "@types/google.maps" {
  type MapTypeStyle = {
    stylers?: Array<{
      color?: string;
      gamma?: number | string;
      hue?: string;
      invertLightness?: boolean;
      lightness?: number | string;
      saturation?: number | string;
      visibility?: "on" | "off" | "simplified";
      weight?: number | string;
    }>;
  };
}
