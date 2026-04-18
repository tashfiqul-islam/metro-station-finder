import {
  ArrowsLeftRightIcon,
  ClockIcon,
  NavigationArrowIcon,
  PathIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { FeaturePreviewPage } from "@/components/common/feature-preview-page";
import { generateHeadConfig } from "@/lib/head-meta";

const TripPlannerPage = (): React.ReactElement => {
  const features = [
    { icon: <PathIcon size={16} weight="duotone" />, label: "Route Planning" },
    { icon: <ClockIcon size={16} weight="duotone" />, label: "Travel Time" },
    {
      icon: <ArrowsLeftRightIcon size={16} weight="duotone" />,
      label: "Interchanges",
    },
    {
      icon: <NavigationArrowIcon size={16} weight="duotone" />,
      label: "Turn-by-Turn",
    },
  ];
  return (
    <FeaturePreviewPage
      title="Trip Planner"
      description="Plan multi-leg journeys across MRT Line 6 with optimal routing, estimated travel times, and interchange guidance."
      features={features}
      progress={30}
      eta="Coming Q3 2026"
    />
  );
};

export const Route = createFileRoute("/trip-planner")({
  component: TripPlannerPage,
  head: () =>
    generateHeadConfig({
      description: "Plan your MRT-6 metro trip. Get optimal routes and fare estimates.",
      path: "/trip-planner",
      title: "Trip Planner",
    }),
});
