import { Suspense } from "react";
import { AboutContent } from "./_components/about-content";

/**
 * About page (Next.js 16 with static export).
 * Provides comprehensive information about the Metro Station Finder application.
 */
export default function AboutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          Loading...
        </div>
      }
    >
      <AboutContent />
    </Suspense>
  );
}
