import { FingerprintIcon, ShieldCheckIcon, SignInIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { FeaturePreviewPage } from "@/components/common/feature-preview-page";
import { generateHeadConfig } from "@/lib/head-meta";

const LoginPage = (): React.ReactElement => {
  const features = [
    { icon: <SignInIcon size={16} weight="duotone" />, label: "Secure sign in" },
    {
      icon: <ShieldCheckIcon size={16} weight="duotone" />,
      label: "Private access",
    },
    {
      icon: <FingerprintIcon size={16} weight="duotone" />,
      label: "Future account sync",
    },
  ];

  return (
    <FeaturePreviewPage
      description="A dedicated login flow will arrive when account-based features are ready. For now, the public MRT tools remain open and usable without sign-in."
      eta="Authentication coming later"
      features={features}
      progress={15}
      title="Log in"
    />
  );
};

/* v8 ignore next -- framework route registration glue */
export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () =>
    generateHeadConfig({
      description:
        "Log in to Metro Station Finder. Account features are planned, but the MRT tools remain open without sign-in for now.",
      path: "/login",
      title: "Log in",
    }),
});
