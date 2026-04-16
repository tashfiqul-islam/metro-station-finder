import { createFileRoute } from "@tanstack/react-router";

const StationFaresPage = (): React.ReactElement => (
  <main className="flex min-h-dvh items-center justify-center">
    <p className="text-muted-foreground">Station Fares — coming soon</p>
  </main>
);

export const Route = createFileRoute("/station-fares")({ component: StationFaresPage });
