import { createFileRoute } from "@tanstack/react-router";

import { generateHeadConfig } from "@/lib/head-meta";

const TripPlannerPage = (): React.ReactElement => (
  <main className="flex min-h-dvh items-center justify-center">
    <p className="text-muted-foreground">Trip Planner — coming soon</p>
  </main>
);

export const Route = createFileRoute("/trip-planner")({
  component: TripPlannerPage,
  head: () =>
    generateHeadConfig({
      description: "Plan your MRT-6 metro trip. Get optimal routes and fare estimates.",
      path: "/trip-planner",
      title: "Trip Planner",
    }),
});
