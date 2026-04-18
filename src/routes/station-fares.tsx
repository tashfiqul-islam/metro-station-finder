import { createFileRoute } from "@tanstack/react-router";
import { ArrowsLeftRight, CreditCard, CurrencyCircleDollar, Receipt } from "@phosphor-icons/react";

import { FeaturePreviewPage } from "@/components/common/feature-preview-page";
import { generateHeadConfig } from "@/lib/head-meta";

const StationFaresPage = (): React.ReactElement => {
  const features = [
    { icon: <CurrencyCircleDollar size={16} weight="duotone" />, label: "Single Journey" },
    { icon: <ArrowsLeftRight size={16} weight="duotone" />, label: "Return Trip" },
    { icon: <CreditCard size={16} weight="duotone" />, label: "MRT Pass" },
    { icon: <Receipt size={16} weight="duotone" />, label: "Full Fare Matrix" },
  ];
  return (
    <FeaturePreviewPage
      title="Station Fares"
      description="Calculate exact fares between any two MRT Line 6 stations. View single journey, return, and MRT Pass pricing instantly."
      features={features}
      progress={50}
      eta="Coming Q3 2026"
    />
  );
};

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
