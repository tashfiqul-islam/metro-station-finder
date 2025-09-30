"use client";

import {
  ArrowRight,
  Clock,
  CreditCard,
  Info,
  MapPin,
  Route,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FareInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/**
 * Props for the FareDisplay component.
 * Shows detailed fare information including pricing breakdown and route details.
 */
export type FareDisplayProps = {
  /** Calculated fare information with breakdown */
  readonly fare?: FareInput;
  /** Name of the origin station */
  readonly originStationName?: string;
  /** Name of the destination station */
  readonly destinationStationName?: string;
  /** Estimated travel time in minutes */
  readonly travelTime?: number;
  /** Additional CSS classes for styling */
  readonly className?: string;
  /** Whether to display detailed route information */
  readonly showRouteDetails?: boolean;
};

const CURRENCY_SYMBOL = "৳" as const;
const DISCOUNT_BADGE_COLORS = {
  light: "bg-green-100 text-green-800",
  dark: "dark:bg-green-900/20 dark:text-green-300",
} as const;

/**
 * Fare display component showing ticket pricing and route information.
 * Displays fare breakdown, discounts, and travel details with proper currency formatting.
 *
 * @example
 * ```tsx
 * <FareDisplay
 *   fare={calculatedFare}
 *   originStationName="Uttara North"
 *   destinationStationName="Motijheel"
 *   travelTime={45}
 * />
 * ```
 */
export function FareDisplay({
  fare,
  originStationName,
  destinationStationName,
  travelTime,
  className,
  showRouteDetails = true,
}: FareDisplayProps) {
  // Format currency with Bangladeshi Taka symbol
  const formatCurrency = (amount: number): string =>
    `${CURRENCY_SYMBOL}${amount.toFixed(0)}`;

  // Convert camelCase to spaced text for display
  const formatComponentName = (name: string): string =>
    name.replace(/([A-Z])/g, " $1").trim();

  if (!fare) {
    return (
      <Card
        className={cn(
          "rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm",
          "fade-in animate-in duration-300",
          className
        )}
      >
        <CardContent className="flex items-center justify-center py-12">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
              <Info
                aria-hidden="true"
                className="h-6 w-6 text-muted-foreground"
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Select origin and destination stations to see fare information
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check for optional fare components
  const hasDiscount = fare.breakdown.discountAmount > 0;
  const hasComponents = Object.keys(fare.breakdown.components).length > 0;
  const estimatedTravelTime = travelTime || fare.travelTime;

  return (
    <Card
      className={cn(
        "rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm",
        "fade-in slide-in-from-bottom-4 animate-in duration-500",
        className
      )}
      data-slot="fare-display"
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard aria-hidden="true" className="h-5 w-5 text-primary" />
          Fare Information
        </CardTitle>

        {/* Route information */}
        {(originStationName || destinationStationName) && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="truncate">{originStationName || "Origin"}</span>
            <ArrowRight aria-hidden="true" className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {destinationStationName || "Destination"}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Travel time */}
        {estimatedTravelTime && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-muted-foreground text-sm">
            <Clock aria-hidden="true" className="h-4 w-4" />
            <span>Estimated travel time: {estimatedTravelTime} minutes</span>
            <span className="sr-only">
              Estimated travel time: {estimatedTravelTime} minutes
            </span>
          </div>
        )}

        {/* Fare breakdown */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-medium text-card-foreground">
            <Route aria-hidden="true" className="h-4 w-4" />
            Fare Breakdown
          </h4>

          <div className="grid gap-2">
            {/* Base fare */}
            <div
              className={cn(
                "group flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3",
                "transition-all duration-200 hover:bg-muted/50 hover:shadow-sm"
              )}
            >
              <div className="flex items-center gap-2">
                <Badge
                  className="bg-blue-100 text-blue-800 text-xs dark:bg-blue-900/20 dark:text-blue-300"
                  variant="secondary"
                >
                  Base Fare
                </Badge>
              </div>

              <div className="text-right">
                <div className="font-semibold text-card-foreground">
                  {formatCurrency(fare.breakdown.baseFare)}
                </div>
              </div>
            </div>

            {/* Discount */}
            {hasDiscount && (
              <div
                className={cn(
                  "group flex items-center justify-between rounded-lg border border-green-200/50 bg-green-50/30 p-3",
                  "transition-all duration-200 hover:bg-green-50/50 hover:shadow-sm",
                  "dark:border-green-800/50 dark:bg-green-950/20 dark:hover:bg-green-950/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      DISCOUNT_BADGE_COLORS.light,
                      DISCOUNT_BADGE_COLORS.dark,
                      "text-xs"
                    )}
                    variant="secondary"
                  >
                    Discount
                  </Badge>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    -{formatCurrency(fare.breakdown.discountAmount)}
                  </div>
                </div>
              </div>
            )}

            {/* Additional components */}
            {hasComponents && (
              <div className="space-y-1">
                {Object.entries(fare.breakdown.components).map(
                  ([component, amount]) => (
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-2 text-xs",
                        "transition-colors duration-200 hover:bg-muted/50"
                      )}
                      key={component}
                    >
                      <span className="text-muted-foreground capitalize">
                        {formatComponentName(component)}
                      </span>
                      <span className="font-medium text-card-foreground">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Total fare */}
        <div className="border-border/50 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-card-foreground">Total Fare</span>
            <output className="font-bold text-2xl text-primary tabular-nums">
              {formatCurrency(fare.amount)}
              <span className="sr-only">
                Total fare: {formatCurrency(fare.amount)}
              </span>
            </output>
          </div>
        </div>

        {/* Discount information */}
        {fare.discount && (
          <div className="space-y-2">
            <h5 className="font-medium text-card-foreground text-sm">
              Applied Discount
            </h5>
            <div className="rounded-lg border border-green-200/50 bg-green-50/30 p-3 dark:border-green-800/50 dark:bg-green-950/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">
                  {fare.discount.type.replace(/-/g, " ")}
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  -{formatCurrency(fare.discount.amount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Route details */}
        {showRouteDetails && (
          <div className="space-y-2">
            <h5 className="font-medium text-card-foreground text-sm">
              Route Details
            </h5>
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3 text-xs">
              <div className="space-y-1">
                <div className="text-muted-foreground">Distance</div>
                <div className="font-medium text-card-foreground">
                  {fare.distance} km
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Travel Time</div>
                <div className="font-medium text-card-foreground">
                  {fare.travelTime} min
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Transfers</div>
                <div className="font-medium text-card-foreground">
                  {fare.route.transfers}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Stations</div>
                <div className="font-medium text-card-foreground">
                  {fare.route.stations.length}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
