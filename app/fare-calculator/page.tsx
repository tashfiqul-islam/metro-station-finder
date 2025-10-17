import { Suspense } from "react";
import { FareCalculatorContent } from "./_components/fare-calculator-content";

/**
 * Fare Calculator page (Next.js 16 with static export).
 * Note: Using client-side searchParams handling for static export compatibility.
 */
export default function FareCalculatorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          Loading...
        </div>
      }
    >
      <FareCalculatorContent />
    </Suspense>
  );
}
