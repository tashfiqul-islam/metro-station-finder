import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/common/legal-page";
import { generateHeadConfig } from "@/lib/head-meta";

const PrivacyPage = (): React.ReactElement => (
  <LegalPage
    lastUpdated="April 2026"
    subtitle="Metro Station Finder is a static, open-source app. We built it to respect your privacy by design — no accounts, no tracking, no data collection."
    title="Privacy Policy"
  >
    <LegalSection title="Overview">
      <p>
        Metro Station Finder does not collect, store, or process any personal data. There is no
        account system, no login, and no analytics tracking. Your use of this app is entirely
        anonymous.
      </p>
    </LegalSection>

    <LegalSection title="Information We Do Not Collect">
      <p>We do not collect:</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>Names, email addresses, or contact information</li>
        <li>Location data or GPS coordinates</li>
        <li>Device identifiers or IP addresses</li>
        <li>Usage patterns, page views, or analytics</li>
        <li>Cookies or local storage beyond theme preference</li>
      </ul>
    </LegalSection>

    <LegalSection title="Theme Preference">
      <p>
        The only data stored locally is your theme preference (light, dark, or system) via{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">localStorage</code>. This
        never leaves your device and is not transmitted anywhere.
      </p>
    </LegalSection>

    <LegalSection title="Third-Party Links">
      <p>
        This app links to external services including GitHub. Those services have their own privacy
        policies which govern their data practices. We have no control over and assume no
        responsibility for the content or practices of any third-party sites.
      </p>
    </LegalSection>

    <LegalSection title="Open Source">
      <p>
        The full source code of this application is publicly available on{" "}
        <a
          className="text-primary underline underline-offset-2 hover:no-underline"
          href="https://github.com/tashfiqul-islam/metro-station-finder"
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </a>
        . You can verify our privacy claims by inspecting the codebase directly.
      </p>
    </LegalSection>

    <LegalSection title="Changes to This Policy">
      <p>
        If this policy changes, updates will be reflected here with a revised date. Given the nature
        of this project, changes are expected to be minimal.
      </p>
    </LegalSection>

    <LegalSection title="Contact">
      <p>
        Questions about this privacy policy? Open an issue on{" "}
        <a
          className="text-primary underline underline-offset-2 hover:no-underline"
          href="https://github.com/tashfiqul-islam/metro-station-finder/issues"
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </a>
        .
      </p>
    </LegalSection>
  </LegalPage>
);

/* v8 ignore next -- framework route registration glue */
export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () =>
    generateHeadConfig({
      description: "Privacy policy for Metro Station Finder. No data collected, no tracking.",
      path: "/privacy",
      title: "Privacy Policy",
    }),
});
