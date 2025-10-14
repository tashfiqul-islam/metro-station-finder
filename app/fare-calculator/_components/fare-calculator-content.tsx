"use client";

import { ArrowRight, Calculator, Info, RefreshCw, Ticket } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StationErrorBoundary } from "@/components/error/station-error-boundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FareDisplay } from "@/components/ui/fare-display";
import { SearchInput } from "@/components/ui/search-input";
import { calculateFare } from "@/lib/api/fares";
import { getAllStations, searchStations } from "@/lib/api/stations";
import { SEARCH_CONSTANTS } from "@/lib/constants";
import type { FareInput } from "@/lib/schemas";
import type { Station } from "@/lib/types/station";
import { cn } from "@/lib/utils";

/**
 * Station selection state.
 */
type StationSelection = {
  readonly origin: Station | undefined;
  readonly destination: Station | undefined;
};

/**
 * Ticket type for fare calculation with discounts.
 */
type TicketType = "single-journey" | "mrt-pass" | "rapid-pass";

/**
 * Ticket information for display.
 */
type TicketInfo = {
  readonly id: TicketType;
  readonly name: string;
  readonly description: string;
  readonly discount: string;
};

/**
 * Available ticket types with descriptions.
 */
const TICKET_TYPES: readonly TicketInfo[] = [
  {
    id: "single-journey",
    name: "Single Journey",
    description: "Standard one-time ticket",
    discount: "No discount",
  },
  {
    id: "mrt-pass",
    name: "MRT Pass",
    description: "Reloadable smart card",
    discount: "10% discount",
  },
  {
    id: "rapid-pass",
    name: "Rapid Pass",
    description: "Premium travel card",
    discount: "10% discount",
  },
] as const;

/**
 * Search state type for station filtering.
 */
type SearchState = "origin" | "destination" | null;

/**
 * Renders a station selection button with search capability.
 */
function StationSelector({
  label,
  station,
  searchQuery,
  isSearching,
  onSearchChange,
  onSelect,
  onStartSearch,
  filteredStations,
  placeholder,
}: {
  readonly label: string;
  readonly station: Station | undefined;
  readonly searchQuery: string;
  readonly isSearching: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onSelect: (station: Station) => void;
  readonly onStartSearch: () => void;
  readonly filteredStations: readonly Station[];
  readonly placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="font-medium text-sm">{label}</div>
      {isSearching ? (
        <div className="space-y-2">
          <SearchInput
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={() => onSearchChange("")}
            placeholder="Search stations..."
            value={searchQuery}
          />
          <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border bg-card">
            {filteredStations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No stations found
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredStations.map((s) => (
                  <button
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
                    key={s.id}
                    onClick={() => onSelect(s)}
                    type="button"
                  >
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {s.aliases[0]}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Button
          className="h-auto justify-start gap-3 px-4 py-3 text-left"
          onClick={onStartSearch}
          variant={station ? "outline" : "secondary"}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Calculator aria-hidden="true" className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">
              {station ? station.name : placeholder}
            </div>
            {station && (
              <div className="text-muted-foreground text-xs">
                {station.aliases[0]}
              </div>
            )}
          </div>
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Renders ticket type selection buttons.
 */
function TicketTypeSelector({
  selectedType,
  onSelect,
}: {
  readonly selectedType: TicketType;
  readonly onSelect: (type: TicketType) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {TICKET_TYPES.map((ticket) => (
        <button
          className={cn(
            "relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all",
            selectedType === ticket.id
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-primary/50"
          )}
          key={ticket.id}
          onClick={() => onSelect(ticket.id)}
          type="button"
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                selectedType === ticket.id ? "bg-primary" : "bg-muted"
              )}
            >
              <Ticket
                aria-hidden="true"
                className={cn(
                  "h-5 w-5",
                  selectedType === ticket.id ? "text-primary-foreground" : ""
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 font-semibold text-sm">{ticket.name}</div>
              <div className="mb-2 text-muted-foreground text-xs">
                {ticket.description}
              </div>
              <Badge
                className="text-xs"
                variant={selectedType === ticket.id ? "default" : "secondary"}
              >
                {ticket.discount}
              </Badge>
            </div>
          </div>
          {selectedType === ticket.id && (
            <div className="absolute top-2 right-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Fare Calculator content component with all client-side logic.
 */
export function FareCalculatorContent() {
  const searchParams = useSearchParams();
  const [selection, setSelection] = useState<StationSelection>({
    origin: undefined,
    destination: undefined,
  });
  const [ticketType, setTicketType] = useState<TicketType>("single-journey");
  const [searchState, setSearchState] = useState<SearchState>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allStationsResponse = useMemo(() => getAllStations(), []);
  const allStations = allStationsResponse.success
    ? allStationsResponse.data
    : [];

  // Handle initial stations from URL params
  useEffect(() => {
    const initialOriginId = searchParams.get("origin");
    const initialDestinationId = searchParams.get("destination");

    if (initialOriginId) {
      const origin = allStations.find((s) => s.id === initialOriginId);
      if (origin) {
        setSelection((prev) => ({ ...prev, origin }));
      }
    }
    if (initialDestinationId) {
      const destination = allStations.find(
        (s) => s.id === initialDestinationId
      );
      if (destination) {
        setSelection((prev) => ({ ...prev, destination }));
      }
    }
  }, [searchParams, allStations]);

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) {
      return allStations;
    }

    const searchResponse = searchStations(
      searchQuery,
      SEARCH_CONSTANTS.maxResultsDefault
    );
    return searchResponse.success
      ? searchResponse.data.map((r) => r.station)
      : [];
  }, [allStations, searchQuery]);

  const calculatedFare = useMemo<FareInput | undefined>(() => {
    if (!(selection.origin && selection.destination)) {
      return;
    }

    try {
      const fareResponse = calculateFare(
        selection.origin.id,
        selection.destination.id,
        { type: ticketType }
      );

      if (!fareResponse.success) {
        return;
      }

      return fareResponse.data as unknown as FareInput;
    } catch {
      return;
    }
  }, [selection.origin, selection.destination, ticketType]);

  const handleOriginSelect = useCallback((station: Station) => {
    setSelection((prev) => ({ ...prev, origin: station }));
    setSearchState(null);
    setSearchQuery("");
  }, []);

  const handleDestinationSelect = useCallback((station: Station) => {
    setSelection((prev) => ({ ...prev, destination: station }));
    setSearchState(null);
    setSearchQuery("");
  }, []);

  const handleSwapStations = useCallback(() => {
    setSelection((prev) => ({
      origin: prev.destination,
      destination: prev.origin,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setSelection({ origin: undefined, destination: undefined });
    setTicketType("single-journey");
    setSearchState(null);
    setSearchQuery("");
  }, []);

  const travelTime = calculatedFare?.travelTime
    ? Number(calculatedFare.travelTime)
    : undefined;

  const canCalculate = selection.origin && selection.destination;

  return (
    <main className="bg-muted/30">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="flex gap-3">
                <Info
                  aria-hidden="true"
                  className="h-5 w-5 flex-shrink-0 text-primary"
                />
                <p className="text-sm">
                  Select your origin and destination stations to calculate the
                  fare. You can also choose your ticket type to see applicable
                  discounts.
                </p>
              </div>
              {canCalculate && (
                <Button onClick={handleReset} size="sm" variant="outline">
                  <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Stations</CardTitle>
              <CardDescription>
                Choose your starting point and destination
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StationErrorBoundary>
                <StationSelector
                  filteredStations={filteredStations}
                  isSearching={searchState === "origin"}
                  label="Origin Station"
                  onSearchChange={setSearchQuery}
                  onSelect={handleOriginSelect}
                  onStartSearch={() => setSearchState("origin")}
                  placeholder="Select origin station"
                  searchQuery={searchQuery}
                  station={selection.origin}
                />
              </StationErrorBoundary>

              {selection.origin && selection.destination && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleSwapStations}
                    size="icon"
                    variant="outline"
                  >
                    <RefreshCw aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only">Swap stations</span>
                  </Button>
                </div>
              )}

              <StationErrorBoundary>
                <StationSelector
                  filteredStations={filteredStations}
                  isSearching={searchState === "destination"}
                  label="Destination Station"
                  onSearchChange={setSearchQuery}
                  onSelect={handleDestinationSelect}
                  onStartSearch={() => setSearchState("destination")}
                  placeholder="Select destination station"
                  searchQuery={searchQuery}
                  station={selection.destination}
                />
              </StationErrorBoundary>
            </CardContent>
          </Card>

          {canCalculate && (
            <Card>
              <CardHeader>
                <CardTitle>Select Ticket Type</CardTitle>
                <CardDescription>
                  Choose your preferred ticket for fare calculation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TicketTypeSelector
                  onSelect={setTicketType}
                  selectedType={ticketType}
                />
              </CardContent>
            </Card>
          )}

          {calculatedFare && selection.origin && selection.destination && (
            <FareDisplay
              destinationStationName={selection.destination.name}
              fare={calculatedFare}
              originStationName={selection.origin.name}
              showRouteDetails
              {...(travelTime !== undefined ? { travelTime } : {})}
            />
          )}
        </div>
      </div>
    </main>
  );
}
