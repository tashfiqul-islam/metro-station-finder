"use client";

import { Bus, Car, Clock, MapPin, Train, Users, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Meters } from "@/lib/types";
import type { Station } from "@/lib/types/station";
import { cn } from "@/lib/utils";

const MAX_AMENITIES_DISPLAY = 4;
const DISTANCE_THRESHOLD_METERS = 1000;
const COORDINATE_PRECISION = 4;
const METERS_PER_MINUTE_WALKING = 80; // Average walking speed

/**
 * Props for the StationCard component.
 * Displays comprehensive station information with interactive features.
 */
export type StationCardProps = {
  /** Station data to display */
  readonly station: Station;
  /** Distance from user location in meters */
  readonly distance?: Meters;
  /** Estimated walking time in minutes */
  readonly walkingTime?: number;
  /** Whether this station is currently selected */
  readonly isSelected?: boolean;
  /** Callback when station is clicked or selected */
  readonly onClick?: (station: Station) => void;
  /** Additional CSS classes for styling */
  readonly className?: string;
  /** Whether to display geographic coordinates */
  readonly showCoordinates?: boolean;
};

/**
 * Station card component displaying station information with distance and amenities.
 * Supports keyboard navigation and provides visual feedback for selection state.
 *
 * @example
 * ```tsx
 * <StationCard
 *   station={station}
 *   distance={500 as Meters}
 *   isSelected={selectedId === station.id}
 *   onClick={(station) => setSelected(station)}
 * />
 * ```
 */
export function StationCard({
  station,
  distance,
  walkingTime,
  isSelected = false,
  onClick,
  className,
  showCoordinates = false,
}: StationCardProps) {
  const handleClick = () => {
    onClick?.(station);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  const formatDistance = (meters: Meters): string => {
    if (meters < DISTANCE_THRESHOLD_METERS) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / DISTANCE_THRESHOLD_METERS).toFixed(1)}km`;
  };

  // Calculate walking time based on average walking speed (80m/min)
  const calculateWalkingTime = (meters: Meters): number =>
    Math.ceil(meters / METERS_PER_MINUTE_WALKING);

  // Map amenity names to their corresponding icons
  const getAmenityIcon = (amenity: string) => {
    const iconClass = "h-3 w-3";
    switch (amenity.toLowerCase()) {
      case "wifi":
        return <Wifi aria-hidden="true" className={iconClass} />;
      case "parking":
        return <Car aria-hidden="true" className={iconClass} />;
      case "bus":
        return <Bus aria-hidden="true" className={iconClass} />;
      case "train":
        return <Train aria-hidden="true" className={iconClass} />;
      default:
        return <MapPin aria-hidden="true" className={iconClass} />;
    }
  };

  // Extract available amenities from station data
  const getAmenityList = (): string[] => {
    const amenities: string[] = [];
    const { amenities: stationAmenities } = station;

    if (stationAmenities.wifi) {
      amenities.push("wifi");
    }
    if (stationAmenities.parking) {
      amenities.push("parking");
    }
    if (stationAmenities.restroom) {
      amenities.push("restroom");
    }
    if (stationAmenities.atm) {
      amenities.push("atm");
    }
    if (stationAmenities.charging) {
      amenities.push("charging");
    }
    if (stationAmenities.food) {
      amenities.push("food");
    }
    if (stationAmenities.shop) {
      amenities.push("shop");
    }

    return amenities;
  };

  const amenities = getAmenityList();
  const displayedAmenities = amenities.slice(0, MAX_AMENITIES_DISPLAY);
  const remainingAmenities = amenities.length - MAX_AMENITIES_DISPLAY;
  const hasAmenities = amenities.length > 0;

  // Use provided walking time or calculate from distance
  const estimatedWalkingTime =
    walkingTime || (distance ? calculateWalkingTime(distance) : undefined);

  // Provide full amenity list for screen readers
  const amenityListDescription = hasAmenities
    ? `Station amenities: ${amenities.join(", ")}`
    : undefined;

  return (
    <Card
      aria-label={`${station.name} station${isSelected ? ", currently selected" : ""}`}
      aria-pressed={isSelected}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-lg hover:shadow-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        "active:translate-y-0",
        isSelected &&
          "border-primary bg-card shadow-lg shadow-primary/10 ring-2 ring-primary/20",
        className
      )}
      data-selected={isSelected}
      data-slot="station-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate font-semibold text-base text-card-foreground leading-tight">
              {station.name}
            </h3>
            {showCoordinates && (
              <p className="truncate font-mono text-muted-foreground text-xs">
                {station.coordinates.lat.toFixed(COORDINATE_PRECISION)},{" "}
                {station.coordinates.lng.toFixed(COORDINATE_PRECISION)}
              </p>
            )}
          </div>

          {isSelected && (
            <Badge
              className="ml-2 shrink-0 bg-primary text-primary-foreground shadow-sm"
              variant="default"
            >
              Selected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Distance and walking time */}
        {(distance || estimatedWalkingTime) && (
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            {distance && (
              <div className="flex items-center gap-1.5">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{formatDistance(distance)}</span>
              </div>
            )}
            {estimatedWalkingTime && (
              <div className="flex items-center gap-1.5">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{estimatedWalkingTime} min walk</span>
              </div>
            )}
          </div>
        )}

        {/* Station ID and line */}
        <div className="flex items-center gap-2">
          <Badge className="font-medium text-xs" variant="secondary">
            {station.id}
          </Badge>
          <Badge
            className="border-primary/20 text-primary text-xs"
            variant="outline"
          >
            MRT-6
          </Badge>
        </div>

        {/* Amenities */}
        {hasAmenities && (
          <div
            aria-description={amenityListDescription}
            className="flex flex-wrap gap-1.5"
          >
            {displayedAmenities.map((amenity) => (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-muted-foreground text-xs",
                  "transition-colors duration-200 hover:bg-muted/70"
                )}
                key={amenity}
              >
                {getAmenityIcon(amenity)}
                <span className="capitalize">{amenity}</span>
              </div>
            ))}
            {remainingAmenities > 0 && (
              <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-muted-foreground text-xs">
                <Users aria-hidden="true" className="h-3 w-3" />
                <span>+{remainingAmenities} more</span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Hover effect overlay */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300",
          "group-hover:opacity-100"
        )}
      />

      {/* Selected indicator */}
      {isSelected && (
        <div
          aria-hidden="true"
          className="-translate-y-8 pointer-events-none absolute top-0 right-0 h-24 w-24 translate-x-8 rounded-full bg-primary/10 blur-2xl"
        />
      )}
    </Card>
  );
}
