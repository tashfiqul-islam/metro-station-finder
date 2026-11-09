import type { ReactElement } from "react";

import { Price } from "../../ui/Price";
import { pickerCopy } from "./copy";
import type { FareRange } from "./station-facts";

/**
 * A fare range as the pages show it: "৳20–৳80" to the eye and "20 taka to 80 taka" to a screen reader, or one
 * price when the cheapest and the dearest are the same. Shared by the picked-station ticket (METRO-112) and the
 * location result (METRO-113), so both read alike.
 */
export function FareRangeText({ range }: { readonly range: FareRange }): ReactElement {
  return (
    <>
      <Price amount={range.cheapest} />
      {range.dearest === range.cheapest ? null : (
        <>
          <span aria-hidden="true">–</span>
          <span className="visually-hidden">{pickerCopy.fareTo}</span>
          <Price amount={range.dearest} />
        </>
      )}
    </>
  );
}
