import { createFileRoute } from "@tanstack/react-router";

import { generateHeadConfig } from "@/lib/head-meta";

const StationFinderPage = (): React.ReactElement => (
  <main className="flex min-h-dvh items-center justify-center">
    <p className="text-muted-foreground">Station Finder — coming soon</p>
  </main>
);

export const Route = createFileRoute("/station-finder")({
  component: StationFinderPage,
  head: () =>
    generateHeadConfig({
      description:
        "Find nearby metro stations on Dhaka's MRT-6 network. Get directions and distances.",
      path: "/station-finder",
      title: "Station Finder",
    }),
});
