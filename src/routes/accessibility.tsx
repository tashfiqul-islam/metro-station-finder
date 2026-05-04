import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/common/legal-page";
import { generateHeadConfig } from "@/lib/head-meta";

const AccessibilityPage = (): React.ReactElement => (
  <LegalPage
    lastUpdated="April 2026"
    subtitle="Metro Station Finder is built to be usable by everyone. We target WCAG 2.1 Level AA compliance and actively work to remove barriers."
    title="Accessibility"
  >
    <LegalSection title="Our Commitment">
      <p>
        We believe transit information should be accessible to all commuters, regardless of ability.
        Metro Station Finder is designed and tested with accessibility as a core requirement, not an
        afterthought.
      </p>
    </LegalSection>

    <LegalSection title="Standards">
      <p>
        We target{" "}
        <a
          className="text-primary underline underline-offset-2 hover:no-underline"
          href="https://www.w3.org/TR/WCAG21/"
          rel="noopener noreferrer"
          target="_blank"
        >
          WCAG 2.1 Level AA
        </a>{" "}
        conformance across all pages. This includes compliance with the four principles of
        accessibility: Perceivable, Operable, Understandable, and Robust.
      </p>
    </LegalSection>

    <LegalSection title="Features">
      <p>Current accessibility features include:</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>Full keyboard navigation — all interactive elements are reachable via Tab</li>
        <li>ARIA labels and landmark roles on all major regions</li>
        <li>Colour contrast ratios meeting or exceeding 4.5:1 for normal text</li>
        <li>Respects the system-level prefers-reduced-motion preference</li>
        <li>Light and dark theme support, switchable without page reload</li>
        <li>Focus-visible indicators on all interactive elements</li>
        <li>Semantic HTML structure with proper heading hierarchy</li>
      </ul>
    </LegalSection>

    <LegalSection title="Known Limitations">
      <p>
        Some interactive map features may have limited screen reader support due to the nature of
        SVG-based visualisations. We are actively working to improve these areas and add text-based
        alternatives where visual content carries meaning.
      </p>
    </LegalSection>

    <LegalSection title="Testing">
      <p>
        Accessibility is verified using a combination of automated tooling (axe-core) and manual
        testing with keyboard-only navigation. We test across modern browsers and aim to support
        commonly used assistive technologies including screen readers.
      </p>
    </LegalSection>

    <LegalSection title="Report an Issue">
      <p>
        Found an accessibility barrier? We want to know. Please open an issue on{" "}
        <a
          className="text-primary underline underline-offset-2 hover:no-underline"
          href="https://github.com/tashfiqul-islam/metro-station-finder/issues"
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </a>{" "}
        with as much detail as possible — the page, the element, the assistive technology you're
        using, and what you expected to happen. We aim to address accessibility reports promptly.
      </p>
    </LegalSection>
  </LegalPage>
);

/* v8 ignore next -- framework route registration glue */
export const Route = createFileRoute("/accessibility")({
  component: AccessibilityPage,
  head: () =>
    generateHeadConfig({
      description:
        "Accessibility statement for Metro Station Finder. WCAG 2.1 AA compliant transit app.",
      path: "/accessibility",
      title: "Accessibility",
    }),
});
