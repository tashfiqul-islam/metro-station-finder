import { InfoIcon, MagnifyingGlassIcon, MapPinIcon, MapTrifoldIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { FeaturePreviewPage } from "@/components/common/feature-preview-page";
import { generateHeadConfig } from "@/lib/head-meta";

const StationFinderPage = (): React.ReactElement => {
  const features = [
    {
      icon: <MagnifyingGlassIcon size={16} weight="duotone" />,
      label: "Name Search",
    },
    { icon: <MapPinIcon size={16} weight="duotone" />, label: "Location View" },
    { icon: <InfoIcon size={16} weight="duotone" />, label: "Station Details" },
    {
      icon: <MapTrifoldIcon size={16} weight="duotone" />,
      label: "Interactive Map",
    },
  ];
  return (
    <FeaturePreviewPage
      title="Station Finder"
      description="Search and explore all 17 MRT Line 6 stations with interactive maps, location details, and nearby landmark information."
      features={features}
      progress={65}
      eta="Coming Q3 2026"
    />
  );
};

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
