import { Suspense } from "react";
import { StationFinderContent } from "./_components/station-finder-content";

/**
 * Station Finder page (Next.js 16 with static export).
 * Note: Using client-side searchParams handling for static export compatibility.
 */
export default function StationFinderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <StationFinderContent />
    </Suspense>
  );
}
