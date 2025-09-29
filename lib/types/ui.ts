/**
 * Metro Station Finder UI Types
 *
 * Project-specific UI types that extend shadcn/ui components.
 * Basic component types are handled by shadcn/ui directly.
 *
 * @fileoverview Metro-specific UI type definitions
 * @version 1.0.0
 * @since 2025-09-28
 */

import type {
  FareDisplayVariant,
  MapTheme,
  StationCardVariant,
  TicketType,
} from "@/lib/constants";
import {
  MAP_THEMES,
  STATION_CARD_VARIANTS,
  TICKET_TYPES,
} from "@/lib/constants";
import type { Coordinates, Meters, Milliseconds } from "@/lib/types";
import type { Station } from "@/lib/types/station";

/**
 * Metro-specific component types
 */

/**
 * Station card component for metro station display
 * Uses TypeScript patterns with discriminated unions for state
 */
export type StationCardProps = {
  readonly station: Station;
  readonly distance?: Meters;
  readonly walkingTime?: number;
  readonly isNearby?: boolean;
  readonly showAmenities?: boolean;
  readonly showDistance?: boolean;
  readonly variant?: StationCardVariant;
  readonly onClick?: (station: Station) => void;
  /** Discriminated union for loading states */
  readonly state?: "idle" | "loading" | "selected" | "error";
  /** Template literal types for event handlers */
  readonly onEvent?: `station:${"select" | "hover" | "focus"}`;
};

/**
 * Fare display component for ticket pricing
 * Uses TypeScript patterns with utility types and generics
 */
export type FareDisplayProps = {
  readonly originStation: Station;
  readonly destinationStation: Station;
  readonly fareAmount: number; // Taka amount
  readonly ticketType: TicketType;
  readonly discount?: number;
  readonly route?: readonly Station[];
  readonly variant?: FareDisplayVariant;
  readonly showBreakdown?: boolean;
  /** Discriminated union for fare calculation state */
  readonly calculationState?:
    | { status: "idle" }
    | { status: "calculating" }
    | { status: "success"; fare: number }
    | { status: "error"; message: string };
  /** Template literal types for fare events */
  readonly onFareEvent?: `fare:${"calculate" | "select" | "book"}`;
};

/**
 * Map component for @vis.gl/react-google-maps
 * Uses TypeScript patterns with branded types and utility types
 */
export type MapMarker = {
  readonly id: string;
  readonly position: Coordinates;
  readonly title: string;
  readonly description?: string;
  readonly isSelected?: boolean;
  readonly station?: Station;
  /** Branded type for marker IDs */
  readonly markerId?: string & { readonly __brand: "MarkerId" };
  /** Discriminated union for marker state */
  readonly state?: "default" | "hovered" | "selected" | "disabled";
};

export type MapProps = {
  readonly center: Coordinates;
  readonly zoom: number;
  readonly theme: MapTheme;
  readonly markers?: readonly MapMarker[];
  readonly selectedMarkerId?: string;
  readonly isInteractive?: boolean;
  readonly showUserLocation?: boolean;
  readonly onMarkerClick?: (marker: MapMarker) => void;
  readonly onMapClick?: (coordinates: Coordinates) => void;
  readonly className?: string;
  /** Template literal types for map events */
  readonly onMapEvent?: `map:${"zoom" | "pan" | "marker:select" | "marker:hover"}`;
  /** Utility types for partial updates */
  readonly mapConfig?: Partial<Pick<MapProps, "center" | "zoom" | "theme">>;
};

/**
 * Search input with autocomplete (extends shadcn Input)
 * Uses TypeScript patterns with generics and utility types
 */
export type SearchInputProps<T = string> = {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly suggestions?: readonly T[];
  readonly isLoading?: boolean;
  readonly placeholder?: string;
  readonly debounceMs?: Milliseconds;
  readonly onSuggestionSelect?: (suggestion: T) => void;
  readonly onSearch?: (query: string) => void;
  /** Discriminated union for search state */
  readonly searchState?:
    | { status: "idle" }
    | { status: "searching"; query: string }
    | { status: "success"; results: T[] }
    | { status: "error"; message: string };
  /** Template literal types for search events */
  readonly onSearchEvent?: `search:${"start" | "complete" | "error" | "clear"}`;
  /** Utility types for search configuration */
  readonly searchConfig?: Partial<
    Pick<SearchInputProps, "debounceMs" | "placeholder">
  >;
};

/**
 * Google Places autocomplete integration
 */
export type PlacesAutocompleteProps = {
  readonly onPlaceSelect: (place: {
    address: string;
    coordinates: Coordinates;
  }) => void;
  readonly placeholder?: string;
  readonly sessionToken?: string;
  readonly quotaExceeded?: boolean;
  readonly isLoading?: boolean;
} & Omit<SearchInputProps, "onSuggestionSelect">;

/**
 * Theme toggle component (uses next-themes)
 */
export type ThemeToggleProps = {
  readonly showLabel?: boolean;
  readonly className?: string;
};

/**
 * Loading states for async operations
 */
export type LoadingState = "idle" | "loading" | "success" | "error";

/**
 * Metro-specific breakpoints (if you need custom responsive behavior)
 */
export const METRO_BREAKPOINTS = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
} as const;

/**
 * Advanced utility types for component composition
 */

/**
 * Utility type for creating component variants with exhaustive checking
 */
export type ComponentVariant<T extends Record<string, string>> = T[keyof T];

/**
 * Utility type for creating event handler types with template literals
 */
export type EventHandler<T extends string> = `on${Capitalize<T>}`;

/**
 * Utility type for creating state management with discriminated unions
 */
export type AsyncState<T, E = string> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: E };

/**
 * Utility type for creating component props with conditional rendering
 */
export type ConditionalProps<T, K extends keyof T> = T & {
  [P in K]: T[P] extends true ? T[P] : never;
};

/**
 * Utility type for creating responsive props
 */
export type ResponsiveProp<T> =
  | T
  | {
      readonly mobile?: T;
      readonly tablet?: T;
      readonly desktop?: T;
    };

/**
 * Component factory types
 */
export type ComponentFactory<TProps, TElement = HTMLElement> = (
  props: TProps
) => TElement;

/**
 * Higher-order component types
 */
export type HigherOrderComponent<TInProps, TOutProps> = (
  Component: ComponentFactory<TInProps>
) => ComponentFactory<TOutProps>;

/**
 * Type guards for metro-specific types with patterns
 */
export function isValidLoadingState(value: unknown): value is LoadingState {
  return (
    typeof value === "string" &&
    ["idle", "loading", "success", "error"].includes(value)
  );
}

/**
 * Type guards with branded types
 */
export function isValidStationCardVariant(
  value: unknown
): value is StationCardVariant {
  return (
    typeof value === "string" &&
    Object.values(STATION_CARD_VARIANTS).includes(value as StationCardVariant)
  );
}

export function isValidMapTheme(value: unknown): value is MapTheme {
  return (
    typeof value === "string" &&
    Object.values(MAP_THEMES).includes(value as MapTheme)
  );
}

export function isValidTicketType(value: unknown): value is TicketType {
  return (
    typeof value === "string" &&
    Object.values(TICKET_TYPES).includes(value as TicketType)
  );
}

/**
 * Utility functions for component composition
 */
export const createComponentVariant =
  <T extends Record<string, string>>(variants: T) =>
  (variant: keyof T): T[keyof T] =>
    variants[variant];

export const createEventHandler = <T extends string>(
  event: T
): EventHandler<T> =>
  `on${event.charAt(0).toUpperCase() + event.slice(1)}` as EventHandler<T>;

/**
 * Component configuration builders
 */
export const createMapConfig = <T extends Partial<MapProps>>(config: T): T =>
  config;

export const createSearchConfig = <T extends Partial<SearchInputProps>>(
  config: T
): T => config;
