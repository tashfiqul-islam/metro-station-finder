"use client";

import { ArrowRightLeft, MapPin, Route, Sparkles, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Dispatch } from "react";
import { memo, useCallback, useMemo } from "react";
import { Button } from "@/app/_components/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/_components/shared/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/app/_components/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/_components/shared/ui/popover";
import { useFareCalculatorComplete } from "@/lib/hooks/fare/use-fare-calculator";
import type { FareCalculatorAction } from "@/lib/hooks/fare/use-fare-calculator-state";
import { useCustomLoading } from "@/lib/hooks/loading/use-custom-loading";
import { useEnhancedOptimistic } from "@/lib/hooks/optimization/use-enhanced-optimistic";
import { useDeferredSearch } from "@/lib/hooks/performance/use-deferred-search";
import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";
import type { TakaAmount } from "@/lib/types";
import type { Fare } from "@/lib/types/fare";
import type { Station } from "@/lib/types/station";

const DISCOUNT_TYPES = ["single-journey", "mrt-pass", "rapid-pass"] as const;

type DiscountType = (typeof DISCOUNT_TYPES)[number];

const TICKET_LABELS: Record<DiscountType, string> = {
  "single-journey": "Single",
  "mrt-pass": "MRT Pass",
  "rapid-pass": "Rapid Pass",
} as const;

const TIMELINE_ANIMATION_DELAY = 0.05;

/**
 * Displays the status of a station in the route (Origin, Destination, or Transit)
 */
const StationStatus = ({ index, totalStations }: { index: number; totalStations: number }) => {
  const status = useMemo(() => {
    if (index === 0) {
      return "Origin";
    }
    if (index === totalStations - 1) {
      return "Destination";
    }
    return "Transit";
  }, [index, totalStations]);

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-green-500" />
      <span className="text-muted-foreground text-xs">{status}</span>
    </div>
  );
};

/**
 * Individual station item in the route plan with animation
 */
const StationItem = memo(
  ({
    station,
    index,
    totalStations,
  }: {
    station: string;
    index: number;
    totalStations: number;
  }) => (
    <motion.div
      animate={{ opacity: 1, x: 0 }}
      className="relative flex items-start gap-4"
      initial={{ opacity: 0, x: 20 }}
      transition={{ delay: index * TIMELINE_ANIMATION_DELAY }}
    >
      {/* Station marker */}
      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80 font-bold text-primary-foreground text-sm shadow-lg">
        {index + 1}
      </div>

      {/* Station card */}
      <div className="flex-1 rounded-xl border border-primary/30 bg-linear-to-br from-card/90 to-card/70 p-4 shadow-lg backdrop-blur-sm dark:border-primary/50 dark:from-card/95 dark:to-card/85">
        <div className="mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary/70" />
          <span className="font-semibold text-foreground text-sm">{station}</span>
        </div>

        <StationStatus index={index} totalStations={totalStations} />
      </div>
    </motion.div>
  )
);

StationItem.displayName = "StationItem";

/**
 * Route plan component displaying the journey from origin to destination
 */
const RoutePlan = memo(({ stations }: { stations: readonly string[] }) => {
  if (!stations?.length) {
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
        <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-linear-to-b from-primary/30 via-primary/60 to-primary/30" />

        <div className="space-y-6">
          {stations.map((station, index) => (
            <StationItem
              index={index}
              key={station}
              station={station}
              totalStations={stations.length}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
});

RoutePlan.displayName = "RoutePlan";

/**
 * Individual fare metric display component
 */
const FareMetric = memo(
  ({ label, value, delay = 0 }: { label: string; value: string | number; delay?: number }) => (
    <motion.div
      animate={{ scale: 1 }}
      className="rounded-lg border border-border/50 bg-card p-4"
      initial={{ scale: 0.9 }}
      transition={{ delay }}
    >
      <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </div>
      <div className="font-bold text-3xl text-primary">{value}</div>
    </motion.div>
  )
);

FareMetric.displayName = "FareMetric";

/**
 * Fare breakdown component showing base fare, discounts, and final amount
 */
const FareBreakdown = memo(({ breakdown }: { breakdown: NonNullable<Fare["breakdown"]> }) => (
  <div className="space-y-2 rounded-lg bg-muted/30 p-4">
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Base Fare</span>
      <span className="font-medium">৳{breakdown.baseFare}</span>
    </div>
    {breakdown.discountAmount > 0 && (
      <div className="flex justify-between text-green-600 text-sm dark:text-green-400">
        <span>Discount</span>
        <span className="font-medium">-৳{breakdown.discountAmount}</span>
      </div>
    )}
    <div className="flex justify-between border-border border-t pt-2 font-semibold text-sm">
      <span>Final Amount</span>
      <span className="text-primary">৳{breakdown.finalAmount}</span>
    </div>
  </div>
));

FareBreakdown.displayName = "FareBreakdown";

/**
 * Main fare results section displaying calculated fare information
 */
const FareResultsSection = memo(
  ({
    displayFare,
    isCalculating = false,
  }: {
    displayFare: Fare | null;
    isCalculating?: boolean;
  }) => {
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
        <Card className="border-primary/20 bg-linear-to-br from-primary/5 to-background shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Fare Details
              {isCalculating && (
                <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <FareMetric label="Total Fare" value={`৳${displayFare.amount}`} />
              <FareMetric
                delay={0.05}
                label="Travel Time"
                value={`${displayFare.travelTime} min`}
              />
              <FareMetric delay={0.1} label="Distance" value={`${displayFare.distance} km`} />
            </div>

            {displayFare.breakdown && <FareBreakdown breakdown={displayFare.breakdown} />}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="mb-1 text-muted-foreground">Stations</div>
                <div className="font-semibold">{displayFare.route.stations.length}</div>
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
);

FareResultsSection.displayName = "FareResultsSection";

/**
 * Custom hook for enhanced fare calculator functionality
 */
function useEnhancedFareCalculator() {
  const {
    state,
    displayFare,
    originStations,
    destinationStations,
    isPending,
    optimisticState,
    handleOriginSelect,
    handleDestinationSelect,
    handleSwap,
    handleDiscountChange,
    dispatch,
  } = useFareCalculatorComplete();

  // Enhanced optimistic updates with error handling
  const { updateOptimistic: updateFareOptimistic } = useEnhancedOptimistic({
    initialState: displayFare,
    updateFn: (currentState, update) => {
      if (currentState && update && typeof update === "object" && "amount" in update) {
        return { ...currentState, amount: update.amount as TakaAmount };
      }
      return currentState;
    },
    onError: () => {
      // Error handling could show toast notification here
    },
    onSuccess: () => {
      // Success handling could show confirmation here
    },
  });

  // Deferred search for better performance
  const { deferredResults: deferredOriginStations } = useDeferredSearch(
    state.originSearch,
    originStations as Station[]
  );

  const { deferredResults: deferredDestinationStations } = useDeferredSearch(
    state.destinationSearch,
    destinationStations as Station[]
  );

  // View Transitions for smooth navigation
  const { startPageTransition } = useViewTransitions();

  // Custom loading behavior
  const { startLoading, completeLoading, isLoading: isCustomLoading } = useCustomLoading();

  // Enhanced station selection with optimistic updates
  const handleEnhancedOriginSelect = useCallback(
    (station: Station) => {
      // Optimistic update
      updateFareOptimistic({ amount: 0 as TakaAmount });
      handleOriginSelect(station);

      // Start loading indicator
      startLoading("fare-calculation", {
        message: `Calculating fare from ${station.name}...`,
        progress: 0,
      });
    },
    [handleOriginSelect, updateFareOptimistic, startLoading]
  );

  const handleEnhancedDestinationSelect = useCallback(
    (station: Station) => {
      // Optimistic update
      updateFareOptimistic({ amount: 0 as TakaAmount });
      handleDestinationSelect(station);

      // Start loading indicator
      startLoading("fare-calculation", {
        message: `Calculating fare to ${station.name}...`,
        progress: 0,
      });
    },
    [handleDestinationSelect, updateFareOptimistic, startLoading]
  );

  // Enhanced swap with View Transitions
  const handleEnhancedSwap = useCallback(() => {
    startPageTransition(() => {
      handleSwap();
    });
  }, [handleSwap, startPageTransition]);

  // Enhanced discount change with optimistic updates
  const handleEnhancedDiscountChange = useCallback(
    (discount: DiscountType) => {
      updateFareOptimistic({ amount: 0 as TakaAmount });
      handleDiscountChange(discount);
    },
    [handleDiscountChange, updateFareOptimistic]
  );

  // Complete loading when fare is calculated
  useMemo(() => {
    if (displayFare && isCustomLoading) {
      completeLoading("fare-calculation", `Fare: ৳${displayFare.amount}`);
    }
  }, [displayFare, isCustomLoading, completeLoading]);

  return {
    state,
    displayFare,
    isPending,
    optimisticState,
    isCustomLoading,
    deferredOriginStations,
    deferredDestinationStations,
    handleEnhancedOriginSelect,
    handleEnhancedDestinationSelect,
    handleEnhancedSwap,
    handleEnhancedDiscountChange,
    dispatch,
  };
}

/**
 * Station selection form component
 */
const StationSelectionForm = memo(function StationSelectionFormComponent({
  state,
  deferredOriginStations,
  deferredDestinationStations,
  handleEnhancedOriginSelect,
  handleEnhancedDestinationSelect,
  handleEnhancedSwap,
  handleEnhancedDiscountChange,
  dispatch,
}: {
  readonly state: {
    readonly origin: Station | null;
    readonly destination: Station | null;
    readonly originOpen: boolean;
    readonly destinationOpen: boolean;
    readonly originSearch: string;
    readonly destinationSearch: string;
    readonly selectedDiscount: DiscountType;
  };
  readonly deferredOriginStations: Station[];
  readonly deferredDestinationStations: Station[];
  readonly handleEnhancedOriginSelect: (station: Station) => void;
  readonly handleEnhancedDestinationSelect: (station: Station) => void;
  readonly handleEnhancedSwap: () => void;
  readonly handleEnhancedDiscountChange: (discount: DiscountType) => void;
  readonly dispatch: Dispatch<FareCalculatorAction>;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="border-border/50 shadow-lg backdrop-blur">
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Station Selection</CardTitle>
            <CardDescription>Select your origin and destination stations</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              transition={{ delay: 0.15 }}
            >
              <label className="font-semibold text-sm" htmlFor="origin-combobox">
                Origin Station
              </label>
              <Popover
                onOpenChange={(open) => dispatch({ type: "SET_ORIGIN_OPEN", payload: open })}
                open={state.originOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    className="w-full justify-start px-3 text-left font-normal"
                    id="origin-combobox"
                    variant="outline"
                  >
                    {state.origin ? (
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span>{state.origin.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Search stations...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-(--radix-popover-trigger-width) p-0"
                  sideOffset={4}
                >
                  <Command>
                    <CommandInput
                      onValueChange={(value) =>
                        dispatch({
                          type: "SET_ORIGIN_SEARCH",
                          payload: value,
                        })
                      }
                      placeholder="Search origin station..."
                      value={state.originSearch}
                    />
                    <CommandEmpty>No stations found</CommandEmpty>
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandGroup>
                        {deferredOriginStations.map((station: Station) => (
                          <CommandItem
                            key={station.id}
                            onSelect={() => handleEnhancedOriginSelect(station)}
                            value={station.id}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{station.name}</span>
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

            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              transition={{ delay: 0.15 }}
            >
              <label className="font-semibold text-sm" htmlFor="destination-combobox">
                Destination Station
              </label>
              <Popover
                onOpenChange={(open) =>
                  dispatch({
                    type: "SET_DESTINATION_OPEN",
                    payload: open,
                  })
                }
                open={state.destinationOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    className="w-full justify-start px-3 text-left font-normal"
                    disabled={!state.origin}
                    id="destination-combobox"
                    variant="outline"
                  >
                    {state.destination ? (
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span>{state.destination.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {state.origin ? "Search stations..." : "Select origin first"}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-(--radix-popover-trigger-width) p-0"
                  sideOffset={4}
                >
                  <Command>
                    <CommandInput
                      onValueChange={(value) =>
                        dispatch({
                          type: "SET_DESTINATION_SEARCH",
                          payload: value,
                        })
                      }
                      placeholder="Search destination station..."
                      value={state.destinationSearch}
                    />
                    <CommandEmpty>No stations found</CommandEmpty>
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandGroup>
                        {deferredDestinationStations.map((station: Station) => (
                          <CommandItem
                            key={station.id}
                            onSelect={() => handleEnhancedDestinationSelect(station)}
                            value={station.id}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{station.name}</span>
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

          {state.origin && state.destination && (
            <motion.div
              animate={{ opacity: 1 }}
              className="flex justify-center"
              initial={{ opacity: 0 }}
            >
              <Button className="gap-2" onClick={handleEnhancedSwap} size="sm" variant="outline">
                <ArrowRightLeft className="h-4 w-4" />
                Swap Stations
              </Button>
            </motion.div>
          )}

          {state.origin && state.destination && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
            >
              <label className="font-semibold text-sm" htmlFor="ticket-type">
                Ticket Type
              </label>
              <div className="grid grid-cols-3 gap-2" id="ticket-type">
                {DISCOUNT_TYPES.map((type) => (
                  <Button
                    className="text-xs"
                    key={type}
                    onClick={() => handleEnhancedDiscountChange(type)}
                    variant={state.selectedDiscount === type ? "default" : "outline"}
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
  );
});

/**
 * Main fare calculator component
 */
export function FareCalculator() {
  const {
    state,
    displayFare,
    isPending,
    optimisticState,
    isCustomLoading,
    deferredOriginStations,
    deferredDestinationStations,
    handleEnhancedOriginSelect,
    handleEnhancedDestinationSelect,
    handleEnhancedSwap,
    handleEnhancedDiscountChange,
    dispatch,
  } = useEnhancedFareCalculator();

  return (
    <div className="page-container min-h-full bg-linear-to-br from-background via-primary/5 to-background">
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
          <p className="text-muted-foreground">Instant fare lookup across all metro stations</p>
        </motion.div>

        <div
          className={`grid grid-cols-1 gap-8 ${state.origin && state.destination && displayFare ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}
        >
          <div
            className={`space-y-8 ${state.origin && state.destination && displayFare ? "lg:col-span-2" : "lg:col-span-1"}`}
          >
            <StationSelectionForm
              deferredDestinationStations={deferredDestinationStations}
              deferredOriginStations={deferredOriginStations}
              dispatch={dispatch}
              handleEnhancedDestinationSelect={handleEnhancedDestinationSelect}
              handleEnhancedDiscountChange={handleEnhancedDiscountChange}
              handleEnhancedOriginSelect={handleEnhancedOriginSelect}
              handleEnhancedSwap={handleEnhancedSwap}
              state={state}
            />

            <AnimatePresence>
              <FareResultsSection
                displayFare={displayFare ?? null}
                isCalculating={isPending || optimisticState.isCalculating || isCustomLoading}
              />
            </AnimatePresence>
          </div>

          {state.origin && state.destination && displayFare && (
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
                    {(isPending || optimisticState.isCalculating) && (
                      <div className="mt-4 flex items-center justify-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="ml-2 text-muted-foreground text-sm">
                          {optimisticState.isCalculating ? "Updating..." : "Calculating..."}
                        </span>
                      </div>
                    )}
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
