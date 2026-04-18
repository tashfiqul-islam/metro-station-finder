import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/common/legal-page";
import { generateHeadConfig } from "@/lib/head-meta";

const TermsPage = (): React.ReactElement => (
  <LegalPage
    lastUpdated="April 2026"
    subtitle="By using Metro Station Finder you agree to these terms. They're short and straightforward — this is a free, open-source tool with no hidden obligations."
    title="Terms of Use"
  >
    <LegalSection title="Acceptance">
      <p>
        By accessing or using Metro Station Finder, you agree to be bound by these Terms of Use. If
        you do not agree, please discontinue use of the application.
      </p>
    </LegalSection>

    <LegalSection title="Free to Use">
      <p>
        Metro Station Finder is and will remain free to use for everyone. There are no subscription
        fees, premium tiers, or paywalls. The app is provided as-is under the MIT License.
      </p>
    </LegalSection>

    <LegalSection title="Data Accuracy">
      <p>
        Fare and station data is sourced from publicly available MRT Line 6 information and is
        maintained on a best-effort basis. Transit schedules, fares, and station details are subject
        to change by the Dhaka Mass Transit Company (DMTCL).
      </p>
      <p>
        Always verify critical journey information — including fares and operating hours — with
        official MRT Line 6 sources before travelling.
      </p>
    </LegalSection>

    <LegalSection title="Permitted Use">
      <p>You may use this application to:</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>Look up MRT Line 6 station and fare information</li>
        <li>Plan journeys across the Dhaka metro network</li>
        <li>Share links to specific fare or station pages</li>
        <li>Fork and adapt the open-source codebase under the MIT License</li>
      </ul>
    </LegalSection>

    <LegalSection title="Prohibited Use">
      <p>You may not:</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>Misrepresent this application as an official DMTCL or government service</li>
        <li>Use automated scraping in a manner that disrupts service availability</li>
        <li>Redistribute modified versions without complying with the MIT License terms</li>
      </ul>
    </LegalSection>

    <LegalSection title="Disclaimer of Warranties">
      <p>
        This application is provided "as is" without warranties of any kind. We make no guarantees
        regarding uptime, data accuracy, or fitness for a particular purpose. Use of this app is at
        your own discretion.
      </p>
    </LegalSection>

    <LegalSection title="Intellectual Property">
      <p>
        The source code is licensed under the{" "}
        <a
          className="text-primary underline underline-offset-2 hover:no-underline"
          href="https://github.com/tashfiqul-islam/metro-station-finder/blob/main/LICENSE"
          rel="noopener noreferrer"
          target="_blank"
        >
          MIT License
        </a>
        . Transit data reflects publicly available MRT Line 6 information.
      </p>
    </LegalSection>

    <LegalSection title="Changes to These Terms">
      <p>
        We may update these terms as the project evolves. Continued use of the app after changes
        constitutes acceptance of the updated terms.
      </p>
    </LegalSection>
  </LegalPage>
);

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () =>
    generateHeadConfig({
      description: "Terms of use for Metro Station Finder. Free, open-source, MIT licensed.",
      path: "/terms",
      title: "Terms of Use",
    }),
});
