import { useReducer } from "react";
import type { Station } from "@/lib/types/station";

type DiscountType = "single-journey" | "mrt-pass" | "rapid-pass";

export type FareCalculatorState = {
  readonly origin: Station | null;
  readonly destination: Station | null;
  readonly selectedDiscount: DiscountType;
  readonly originOpen: boolean;
  readonly destinationOpen: boolean;
  readonly originSearch: string;
  readonly destinationSearch: string;
};

export type FareCalculatorAction =
  | { readonly type: "SET_ORIGIN"; readonly payload: Station | null }
  | { readonly type: "SET_DESTINATION"; readonly payload: Station | null }
  | { readonly type: "SET_DISCOUNT"; readonly payload: DiscountType }
  | { readonly type: "SET_ORIGIN_OPEN"; readonly payload: boolean }
  | { readonly type: "SET_DESTINATION_OPEN"; readonly payload: boolean }
  | { readonly type: "SET_ORIGIN_SEARCH"; readonly payload: string }
  | { readonly type: "SET_DESTINATION_SEARCH"; readonly payload: string }
  | { readonly type: "SWAP_STATIONS" }
  | { readonly type: "RESET_SEARCHES" };

/**
 * Reducer function for managing fare calculator state
 */
function fareCalculatorReducer(
  state: FareCalculatorState,
  action: FareCalculatorAction
): FareCalculatorState {
  switch (action.type) {
    case "SET_ORIGIN":
      return { ...state, origin: action.payload };
    case "SET_DESTINATION":
      return { ...state, destination: action.payload };
    case "SET_DISCOUNT":
      return { ...state, selectedDiscount: action.payload };
    case "SET_ORIGIN_OPEN":
      return { ...state, originOpen: action.payload };
    case "SET_DESTINATION_OPEN":
      return { ...state, destinationOpen: action.payload };
    case "SET_ORIGIN_SEARCH":
      return { ...state, originSearch: action.payload };
    case "SET_DESTINATION_SEARCH":
      return { ...state, destinationSearch: action.payload };
    case "SWAP_STATIONS":
      return {
        ...state,
        origin: state.destination,
        destination: state.origin,
      };
    case "RESET_SEARCHES":
      return {
        ...state,
        originSearch: "",
        destinationSearch: "",
      };
    default:
      return state;
  }
}

/**
 * Custom hook for managing fare calculator state with useReducer
 */
export function useFareCalculatorState() {
  const [state, dispatch] = useReducer(fareCalculatorReducer, {
    origin: null,
    destination: null,
    selectedDiscount: "single-journey",
    originOpen: false,
    destinationOpen: false,
    originSearch: "",
    destinationSearch: "",
  });

  return { state, dispatch } as const;
}
