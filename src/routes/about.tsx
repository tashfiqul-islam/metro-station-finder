import { createFileRoute } from "@tanstack/react-router";

const AboutPage = (): React.ReactElement => (
  <main className="flex min-h-dvh items-center justify-center">
    <p className="text-muted-foreground">About — coming soon</p>
  </main>
);

export const Route = createFileRoute("/about")({ component: AboutPage });
