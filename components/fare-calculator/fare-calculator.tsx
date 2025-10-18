"use client";

import { ArrowRightLeft, MapPin, Route, Sparkles, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAllStations } from "@/lib/api/stations";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useFareCalculator } from "@/lib/hooks/use-fare-calculator";
import { useStationSearch } from "@/lib/hooks/use-station-search";
import type { StationId } from "@/lib/types";
import type { Fare } from "@/lib/types/fare";
import type { Station } from "@/lib/types/station";

const DISCOUNT_TYPES = ["single-journey", "mrt-pass", "rapid-pass"] as const;

type DiscountType = (typeof DISCOUNT_TYPES)[number];

const TICKET_LABELS: Record<DiscountType, string> = {
  "single-journey": "Single",
  "mrt-pass": "MRT Pass",
  "rapid-pass": "Rapid Pass",
};

const TIMELINE_ANIMATION_DELAY = 0.05;
const SEARCH_DEBOUNCE_DELAY = 300;

// Simple state management - no complex patterns needed

// Simple handlers - no complex patterns needed
function useFareCalculatorHandlers({
  origin,
  destination,
  setOrigin,
  setDestination,
  setOriginOpen,
  setDestinationOpen,
  setOriginSearch,
  setDestinationSearch,
  setSelectedDiscount,
}: {
  origin: Station | null;
  destination: Station | null;
  setOrigin: (station: Station | null) => void;
  setDestination: (station: Station | null) => void;
  setOriginOpen: (open: boolean) => void;
  setDestinationOpen: (open: boolean) => void;
  setOriginSearch: (search: string) => void;
  setDestinationSearch: (search: string) => void;
  setSelectedDiscount: (discount: DiscountType) => void;
}) {
  const handleOriginSelect = useCallback(
    (station: Station) => {
      setOrigin(station);
      setOriginOpen(false);
      setOriginSearch("");
    },
    [setOrigin, setOriginOpen, setOriginSearch]
  );

  const handleDestinationSelect = useCallback(
    (station: Station) => {
      setDestination(station);
      setDestinationOpen(false);
      setDestinationSearch("");
    },
    [setDestination, setDestinationOpen, setDestinationSearch]
  );

  const handleSwap = useCallback(() => {
    if (!(origin && destination)) {
      return;
    }

    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  }, [origin, destination, setOrigin, setDestination]);

  const handleDiscountChange = useCallback(
    (discount: DiscountType) => {
      setSelectedDiscount(discount);
    },
    [setSelectedDiscount]
  );

  return {
    handleOriginSelect,
    handleDestinationSelect,
    handleSwap,
    handleDiscountChange,
  };
}

function RoutePlan({ stations }: { stations: readonly string[] }) {
  if (!stations || stations.length === 0) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
    >
      <div className="flex items-center gap-2">
        <Route className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-lg">Route Plan</h3>
      </div>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-gradient-to-b from-primary/30 via-primary/60 to-primary/30" />

        <div className="space-y-6">
          {stations.map((station, index) => (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="relative flex items-start gap-4"
              initial={{ opacity: 0, x: 20 }}
              key={station}
              transition={{ delay: index * TIMELINE_ANIMATION_DELAY }}
            >
              {/* Station marker */}
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 font-bold text-primary-foreground text-sm shadow-lg">
                {index + 1}
              </div>

              {/* Station card */}
              <div className="flex-1 rounded-xl border border-primary/30 bg-gradient-to-br from-card/90 to-card/70 p-4 shadow-lg backdrop-blur-sm dark:border-primary/50 dark:from-card/95 dark:to-card/85">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary/70" />
                  <span className="font-semibold text-foreground text-sm">
                    {station}
                  </span>
                </div>

                {/* Station status */}
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground text-xs">
                    {(() => {
                      if (index === 0) {
                        return "Origin";
                      }
                      if (index === stations.length - 1) {
                        return "Destination";
                      }
                      return "Transit";
                    })()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function FareResultsSection({ displayFare }: { displayFare: Fare | null }) {
  if (!displayFare) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{
        damping: 30,
        stiffness: 300,
        type: "spring",
      }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Fare Details
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <motion.div
              animate={{ scale: 1 }}
              className="rounded-lg border border-border/50 bg-card p-4"
              initial={{ scale: 0.9 }}
            >
              <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Total Fare
              </div>
              <div className="font-bold text-3xl text-primary">
                ৳{displayFare.amount}
              </div>
            </motion.div>

            <motion.div
              animate={{ scale: 1 }}
              className="rounded-lg border border-border/50 bg-card p-4"
              initial={{ scale: 0.9 }}
              transition={{ delay: 0.05 }}
            >
              <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Travel Time
              </div>
              <div className="font-bold text-3xl text-foreground">
                {displayFare.travelTime} min
              </div>
            </motion.div>

            <motion.div
              animate={{ scale: 1 }}
              className="rounded-lg border border-border/50 bg-card p-4"
              initial={{ scale: 0.9 }}
              transition={{ delay: 0.1 }}
            >
              <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Distance
              </div>
              <div className="font-bold text-3xl text-foreground">
                {displayFare.distance} km
              </div>
            </motion.div>
          </div>

          {displayFare.breakdown && (
            <div className="space-y-2 rounded-lg bg-muted/30 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Fare</span>
                <span className="font-medium">
                  ৳{displayFare.breakdown.baseFare}
                </span>
              </div>
              {displayFare.breakdown.discountAmount > 0 && (
                <div className="flex justify-between text-green-600 text-sm dark:text-green-400">
                  <span>Discount</span>
                  <span className="font-medium">
                    -৳{displayFare.breakdown.discountAmount}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-border border-t pt-2 font-semibold text-sm">
                <span>Final Amount</span>
                <span className="text-primary">
                  ৳{displayFare.breakdown.finalAmount}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="mb-1 text-muted-foreground">Stations</div>
              <div className="font-semibold">
                {displayFare.route.stations.length}
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="mb-1 text-muted-foreground">Transfers</div>
              <div className="font-semibold">{displayFare.route.transfers}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function FareCalculator() {
  const [origin, setOrigin] = useState<Station | null>(null);
  const [destination, setDestination] = useState<Station | null>(null);
  const [selectedDiscount, setSelectedDiscount] =
    useState<DiscountType>("single-journey");
  const [originOpen, setOriginOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [originSearch, setOriginSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");

  // Simple state management - no complex patterns needed

  // Use custom hooks for better separation of concerns
  const displayFare = useFareCalculator({
    origin: origin?.id as StationId,
    destination: destination?.id as StationId,
    discountType: selectedDiscount,
  });

  // Debounce search inputs for better performance
  const debouncedOriginSearch = useDebouncedValue(
    originSearch,
    SEARCH_DEBOUNCE_DELAY
  );
  const debouncedDestinationSearch = useDebouncedValue(
    destinationSearch,
    SEARCH_DEBOUNCE_DELAY
  );

  // Use station search hooks
  const filteredOriginStations = useStationSearch({
    query: debouncedOriginSearch,
    limit: 50,
  });
  const filteredDestinationStations = useStationSearch({
    query: debouncedDestinationSearch,
    limit: 50,
  });

  // Get all stations for when search is empty
  const allStations = useMemo(() => {
    const result = getAllStations();
    return result.success ? result.data : [];
  }, []);

  const originStations = debouncedOriginSearch
    ? filteredOriginStations
    : allStations;
  const destinationStations = debouncedDestinationSearch
    ? filteredDestinationStations
    : allStations;

  // Simple handlers for smooth UX
  const {
    handleOriginSelect,
    handleDestinationSelect,
    handleSwap,
    handleDiscountChange,
  } = useFareCalculatorHandlers({
    origin,
    destination,
    setOrigin,
    setDestination,
    setOriginOpen,
    setDestinationOpen,
    setOriginSearch,
    setDestinationSearch,
    setSelectedDiscount,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 space-y-2 text-center"
          initial={{ opacity: 0, y: -20 }}
        >
          <h1 className="font-bold text-3xl text-foreground tracking-tight md:text-4xl">
            Calculate Your Fare
          </h1>
          <p className="text-muted-foreground">
            Instant fare lookup across all metro stations
          </p>
        </motion.div>

        <div
          className={`grid grid-cols-1 gap-8 ${origin && destination && displayFare ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}
        >
          {/* Left Column - Station Selection & Fare Details */}
          <div
            className={`space-y-8 ${origin && destination && displayFare ? "lg:col-span-2" : "lg:col-span-1"}`}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-border/50 shadow-lg backdrop-blur">
                <CardHeader className="space-y-4">
                  <div>
                    <CardTitle>Station Selection</CardTitle>
                    <CardDescription>
                      Select your origin and destination stations
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Origin Station ComboBox */}
                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      transition={{ delay: 0.15 }}
                    >
                      <label
                        className="font-semibold text-sm"
                        htmlFor="origin-combobox"
                      >
                        Origin Station
                      </label>
                      <Popover onOpenChange={setOriginOpen} open={originOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            className="w-full justify-start px-3 text-left font-normal"
                            id="origin-combobox"
                            variant="outline"
                          >
                            {origin ? (
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                <span>{origin.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                Search stations...
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-[var(--radix-popover-trigger-width)] p-0"
                          sideOffset={4}
                        >
                          <Command>
                            <CommandInput
                              onValueChange={setOriginSearch}
                              placeholder="Search origin station..."
                              value={originSearch}
                            />
                            <CommandEmpty>No stations found</CommandEmpty>
                            <CommandList className="max-h-[300px] overflow-y-auto">
                              <CommandGroup>
                                {originStations.map((station: Station) => (
                                  <CommandItem
                                    key={station.id}
                                    onSelect={() => handleOriginSelect(station)}
                                    value={station.id}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {station.name}
                                      </span>
                                      {station.aliases[0] && (
                                        <span className="text-muted-foreground text-xs">
                                          {station.aliases[0]}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </motion.div>

                    {/* Destination Station ComboBox */}
                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-2"
                      initial={{ opacity: 0, x: 20 }}
                      transition={{ delay: 0.15 }}
                    >
                      <label
                        className="font-semibold text-sm"
                        htmlFor="destination-combobox"
                      >
                        Destination Station
                      </label>
                      <Popover
                        onOpenChange={setDestinationOpen}
                        open={destinationOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            className="w-full justify-start px-3 text-left font-normal"
                            disabled={!origin}
                            id="destination-combobox"
                            variant="outline"
                          >
                            {destination ? (
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <span>{destination.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                {origin
                                  ? "Search stations..."
                                  : "Select origin first"}
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-[var(--radix-popover-trigger-width)] p-0"
                          sideOffset={4}
                        >
                          <Command>
                            <CommandInput
                              onValueChange={setDestinationSearch}
                              placeholder="Search destination station..."
                              value={destinationSearch}
                            />
                            <CommandEmpty>No stations found</CommandEmpty>
                            <CommandList className="max-h-[300px] overflow-y-auto">
                              <CommandGroup>
                                {destinationStations.map((station: Station) => (
                                  <CommandItem
                                    key={station.id}
                                    onSelect={() =>
                                      handleDestinationSelect(station)
                                    }
                                    value={station.id}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {station.name}
                                      </span>
                                      {station.aliases[0] && (
                                        <span className="text-muted-foreground text-xs">
                                          {station.aliases[0]}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </motion.div>
                  </div>

                  {origin && destination && (
                    <motion.div
                      animate={{ opacity: 1 }}
                      className="flex justify-center"
                      initial={{ opacity: 0 }}
                    >
                      <Button
                        className="gap-2"
                        onClick={handleSwap}
                        size="sm"
                        variant="outline"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Swap Stations
                      </Button>
                    </motion.div>
                  )}

                  {origin && destination && (
                    <motion.div
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                      initial={{ opacity: 0, y: 10 }}
                    >
                      <label
                        className="font-semibold text-sm"
                        htmlFor="ticket-type"
                      >
                        Ticket Type
                      </label>
                      <div className="grid grid-cols-3 gap-2" id="ticket-type">
                        {DISCOUNT_TYPES.map((type) => (
                          <Button
                            className="text-xs"
                            key={type}
                            onClick={() => handleDiscountChange(type)}
                            variant={
                              selectedDiscount === type ? "default" : "outline"
                            }
                          >
                            {TICKET_LABELS[type]}
                          </Button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <AnimatePresence>
              <FareResultsSection displayFare={displayFare ?? null} />
            </AnimatePresence>
          </div>

          {/* Right Column - Route Plan */}
          {origin && destination && displayFare && (
            <div className="lg:col-span-1">
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="sticky top-8"
                initial={{ opacity: 0, x: 20 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border border-primary/40 bg-card/95 shadow-2xl backdrop-blur-md dark:border-primary/60 dark:bg-card/90 dark:shadow-primary/10">
                  <CardContent className="p-6">
                    <RoutePlan stations={displayFare.route.stations} />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
