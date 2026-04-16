import { createFileRoute } from "@tanstack/react-router";

import { generateHeadConfig } from "@/lib/head-meta";

const StationFaresPage = (): React.ReactElement => (
  <main className="flex min-h-dvh items-center justify-center">
    <p className="text-muted-foreground">Station Fares — coming soon</p>
  </main>
);

export const Route = createFileRoute("/station-fares")({
  component: StationFaresPage,
  head: () =>
    generateHeadConfig({
      description:
        "View and calculate metro fares between stations on MRT-6. Official DMTCL rates.",
      path: "/station-fares",
      title: "Station Fares",
    }),
});
