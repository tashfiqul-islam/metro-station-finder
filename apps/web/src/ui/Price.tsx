import type { ReactElement } from "react";

interface PriceProps {
  /** Fare in taka (BDT). */
  readonly amount: number;
}

/**
 * A fare with the taka sign. The sign is not in the Latin font subset (it falls back to a system font) and
 * screen readers read it inconsistently, so the visible text is hidden from them and replaced by
 * "<amount> taka" (owner decision 2026-11-08, METRO-105). Where the slice shows the currency code instead
 * ("BDT 50", the current nearest-station copy), it does not use this component.
 */
export function Price({ amount }: PriceProps): ReactElement {
  return (
    <>
      <span aria-hidden="true">৳{amount}</span>{" "}
      <span className="visually-hidden">{amount} taka</span>
    </>
  );
}
