import { useMemo, useOptimistic, useTransition } from "react";
import { calculateFare } from "@/lib/api/fares";
import type { StationId } from "@/lib/types";
import type { Fare } from "@/lib/types/fare";
import { useFareCalculatorActions } from "./use-fare-calculator-actions";
import { useFareCalculatorState } from "./use-fare-calculator-state";
import { useStationData } from "./use-station-search";

/**
 * Comprehensive hook for fare calculator functionality
 * Combines state management, actions, and data fetching
 */
export function useFareCalculatorComplete() {
  const { state, dispatch } = useFareCalculatorState();

  const [isPending, startTransition] = useTransition();

  const [optimisticState, addOptimisticUpdate] = useOptimistic(
    { isCalculating: false },
    (currentState, optimisticUpdate: { isCalculating: boolean }) => ({
      ...currentState,
      ...optimisticUpdate,
    })
  );

  const displayFare = useMemo((): Fare | undefined => {
    if (state.origin?.id === undefined || state.destination?.id === undefined) {
      return;
    }
    try {
      const result = calculateFare(
        state.origin.id as StationId,
        state.destination.id as StationId,
        {
          type: state.selectedDiscount,
        }
      );
      return result.success ? result.data : undefined;
    } catch {
      return;
    }
  }, [state.origin?.id, state.destination?.id, state.selectedDiscount]);

  const { originStations, destinationStations } = useStationData(state);

  const actions = useFareCalculatorActions(
    state,
    dispatch,
    startTransition,
    addOptimisticUpdate
  );

  return {
    // State
    state,
    displayFare,
    originStations,
    destinationStations,
    isPending,
    optimisticState,

    // Actions
    ...actions,

    // Direct dispatch for specific actions
    dispatch,
  } as const;
}
