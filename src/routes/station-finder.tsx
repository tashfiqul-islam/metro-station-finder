import { createFileRoute } from "@tanstack/react-router";

const StationFinderPage = (): React.ReactElement => (
  <main className="flex min-h-dvh items-center justify-center">
    <p className="text-muted-foreground">Station Finder — coming soon</p>
  </main>
);

export const Route = createFileRoute("/station-finder")({ component: StationFinderPage });
