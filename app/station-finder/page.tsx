import { Suspense } from "react";
import { StationFinderContent } from "./_components/station-finder-content";

type StationFinderSearchParams = {
  readonly station?: string | string[];
};

type StationFinderPageProps = {
  readonly searchParams: Promise<StationFinderSearchParams>;
};

/**
 * Station Finder page (Next.js 16 server component with async searchParams).
 */
export default async function StationFinderPage({
  searchParams,
}: StationFinderPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialStationId =
    typeof resolvedSearchParams.station === "string"
      ? resolvedSearchParams.station
      : undefined;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-border/40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 animate-pulse rounded bg-muted" />
                <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </header>
          <main className="flex-1 bg-muted/30">
            <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <div className="space-y-6">
                <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          </main>
        </div>
      }
    >
      <StationFinderContent initialStationId={initialStationId} />
    </Suspense>
  );
}
