import { useCallback } from "react";
import type { Station } from "@/lib/types/station";
import type { FareCalculatorAction, FareCalculatorState } from "./use-fare-calculator-state";

type DiscountType = "single-journey" | "mrt-pass" | "rapid-pass";

const OPTIMISTIC_UPDATE_DELAYS = {
  stationSelection: 500,
  stationSwap: 300,
  discountChange: 200,
} as const;

/**
 * Custom hook for managing fare calculator event handlers with optimistic updates
 */
export function useFareCalculatorActions(
  state: FareCalculatorState,
  dispatch: React.Dispatch<FareCalculatorAction>,
  startTransition: (callback: () => void) => void,
  addOptimisticUpdate: (update: { isCalculating: boolean }) => void
) {
  const handleOriginSelect = useCallback(
    (station: Station) => {
      startTransition(() => {
        addOptimisticUpdate({ isCalculating: true });

        dispatch({ type: "SET_ORIGIN", payload: station });
        dispatch({ type: "SET_ORIGIN_OPEN", payload: false });
        dispatch({ type: "RESET_SEARCHES" });

        setTimeout(() => {
          startTransition(() => {
            addOptimisticUpdate({ isCalculating: false });
          });
        }, OPTIMISTIC_UPDATE_DELAYS.stationSelection);
      });
    },
    [dispatch, startTransition, addOptimisticUpdate]
  );

  const handleDestinationSelect = useCallback(
    (station: Station) => {
      startTransition(() => {
        addOptimisticUpdate({ isCalculating: true });

        dispatch({ type: "SET_DESTINATION", payload: station });
        dispatch({ type: "SET_DESTINATION_OPEN", payload: false });
        dispatch({ type: "RESET_SEARCHES" });

        setTimeout(() => {
          startTransition(() => {
            addOptimisticUpdate({ isCalculating: false });
          });
        }, OPTIMISTIC_UPDATE_DELAYS.stationSelection);
      });
    },
    [dispatch, startTransition, addOptimisticUpdate]
  );

  const handleSwap = useCallback(() => {
    if (!(state.origin && state.destination)) {
      return;
    }

    startTransition(() => {
      addOptimisticUpdate({ isCalculating: true });

      dispatch({ type: "SWAP_STATIONS" });

      setTimeout(() => {
        startTransition(() => {
          addOptimisticUpdate({ isCalculating: false });
        });
      }, OPTIMISTIC_UPDATE_DELAYS.stationSwap);
    });
  }, [state.origin, state.destination, dispatch, startTransition, addOptimisticUpdate]);

  const handleDiscountChange = useCallback(
    (discount: DiscountType) => {
      startTransition(() => {
        addOptimisticUpdate({ isCalculating: true });

        dispatch({ type: "SET_DISCOUNT", payload: discount });

        setTimeout(() => {
          startTransition(() => {
            addOptimisticUpdate({ isCalculating: false });
          });
        }, OPTIMISTIC_UPDATE_DELAYS.discountChange);
      });
    },
    [dispatch, startTransition, addOptimisticUpdate]
  );

  return {
    handleOriginSelect,
    handleDestinationSelect,
    handleSwap,
    handleDiscountChange,
  } as const;
}
