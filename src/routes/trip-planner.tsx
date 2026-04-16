import { createFileRoute } from "@tanstack/react-router";

const TripPlannerPage = (): React.ReactElement => (
  <main className="flex min-h-dvh items-center justify-center">
    <p className="text-muted-foreground">Trip Planner — coming soon</p>
  </main>
);

export const Route = createFileRoute("/trip-planner")({ component: TripPlannerPage });
