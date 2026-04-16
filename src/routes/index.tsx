import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/pages/home/home-page";
import { generateHeadConfig } from "@/lib/head-meta";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () =>
    generateHeadConfig({
      description:
        "Find metro stations and fares on Dhaka's MRT-6 network. Open source, free, and no tracking.",
      path: "/",
      title: "Metro Station Finder",
    }),
});
