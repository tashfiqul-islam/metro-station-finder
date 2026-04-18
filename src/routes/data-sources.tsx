import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/common/legal-page";
import { generateHeadConfig } from "@/lib/head-meta";

const DataSourcesPage = (): React.ReactElement => (
  <LegalPage
    lastUpdated="April 2026"
    subtitle="Transparency about where our MRT Line 6 data comes from, how it's maintained, and how you can help keep it accurate."
    title="Data Sources"
  >
    <LegalSection title="MRT Line 6 Station Data">
      <p>
        Station names, order, and geographic positions are sourced from publicly available
        information published by the{" "}
        <a
          className="text-primary underline underline-offset-2 hover:no-underline"
          href="https://dmtcl.gov.bd"
          rel="noopener noreferrer"
          target="_blank"
        >
          Dhaka Mass Transit Company Limited (DMTCL)
        </a>
        , the government entity responsible for operating MRT Line 6.
      </p>
      <p>The dataset covers all 16 operational stations from Uttara North to Motijheel.</p>
    </LegalSection>

    <LegalSection title="Fare Information">
      <p>
        Fare data reflects the officially published MRT Line 6 fare matrix as of 2026. Fares are
        distance-based and cover all 120+ station-pair combinations across the network.
      </p>
      <p>
        Fares shown are for standard single-journey tickets. Rapid Pass (MRT card) discount fares,
        and any concessionary fares, are not currently included.
      </p>
    </LegalSection>

    <LegalSection title="Data Currency">
      <p>
        All data in this application reflects MRT Line 6 information as of{" "}
        <strong className="font-medium text-foreground">April 2026</strong>. DMTCL may revise fares,
        add stations, or adjust operating parameters at any time.
      </p>
      <p>
        We update the dataset when official changes are announced. Check the{" "}
        <a
          className="text-primary underline underline-offset-2 hover:no-underline"
          href="https://github.com/tashfiqul-islam/metro-station-finder/commits/main"
          rel="noopener noreferrer"
          target="_blank"
        >
          commit history
        </a>{" "}
        to see when data was last revised.
      </p>
    </LegalSection>

    <LegalSection title="What Is Not Included">
      <ul className="ml-4 list-disc space-y-1.5">
        <li>Real-time train positions or live arrival times</li>
        <li>Rapid Pass card balance or transaction history</li>
        <li>Crowd density or service disruption alerts</li>
        <li>Concessionary or group fare pricing</li>
      </ul>
      <p>
        These would require a direct integration with DMTCL systems, which is not currently
        available for third-party applications.
      </p>
    </LegalSection>

    <LegalSection title="Open Data">
      <p>
        The structured fare and station dataset used in this application is open and versioned in
        the project repository. You are welcome to use it in your own projects in accordance with
        the{" "}
        <a
          className="text-primary underline underline-offset-2 hover:no-underline"
          href="https://github.com/tashfiqul-islam/metro-station-finder/blob/main/LICENSE"
          rel="noopener noreferrer"
          target="_blank"
        >
          MIT License
        </a>
        .
      </p>
    </LegalSection>

    <LegalSection title="Report Incorrect Data">
      <p>
        If you spot incorrect fares, wrong station names, or any other data inaccuracy, please open
        an issue on{" "}
        <a
          className="text-primary underline underline-offset-2 hover:no-underline"
          href="https://github.com/tashfiqul-islam/metro-station-finder/issues"
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </a>
        . Include the affected station or route, the value shown, and the correct value with a
        reference source if possible. Community corrections are reviewed and merged promptly.
      </p>
    </LegalSection>
  </LegalPage>
);

export const Route = createFileRoute("/data-sources")({
  component: DataSourcesPage,
  head: () =>
    generateHeadConfig({
      description:
        "Data sources for Metro Station Finder — MRT Line 6 station and fare data from DMTCL.",
      path: "/data-sources",
      title: "Data Sources",
    }),
});
