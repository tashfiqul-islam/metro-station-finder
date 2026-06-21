import { createFileRoute } from "@tanstack/react-router";

import { StationFinderRoute } from "@/features/station-finder/route";
import { generateHeadConfig } from "@/lib/head-meta";

export const Route = createFileRoute("/station-finder")({
  component: StationFinderRoute,
  head: () =>
    generateHeadConfig({
      description:
        "Preview all MRT-6 stations and the live Dhaka metro corridor on an interactive map.",
      path: "/station-finder",
      title: "Station Finder",
    }),
});
