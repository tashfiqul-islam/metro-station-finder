import { SparkleIcon, UserPlusIcon, WalletIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { FeaturePreviewPage } from "@/components/common/feature-preview-page";
import { generateHeadConfig } from "@/lib/head-meta";

const SignupPage = (): React.ReactElement => {
  const features = [
    { icon: <UserPlusIcon size={16} weight="duotone" />, label: "Fast onboarding" },
    { icon: <WalletIcon size={16} weight="duotone" />, label: "Saved preferences" },
    { icon: <SparkleIcon size={16} weight="duotone" />, label: "Future premium tools" },
  ];

  return (
    <FeaturePreviewPage
      description="Account creation is planned for future personalization and saved tools. The current MRT experience stays accessible without registration."
      eta="Accounts coming later"
      features={features}
      progress={15}
      title="Sign up"
    />
  );
};

/* v8 ignore next -- framework route registration glue */
export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () =>
    generateHeadConfig({
      description:
        "Sign up for Metro Station Finder. Accounts are planned for saved preferences and future personalized MRT features.",
      path: "/signup",
      title: "Sign up",
    }),
});
