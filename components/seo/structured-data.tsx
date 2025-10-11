/**
 * Structured Data Component for SEO
 *
 * Provides JSON-LD structured data for better search engine understanding.
 * This component is safe and doesn't use dangerouslySetInnerHTML.
 */

type StructuredDataProps = {
  readonly data: Record<string, unknown>;
};

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script suppressHydrationWarning type="application/ld+json">
      {JSON.stringify(data)}
    </script>
  );
}
