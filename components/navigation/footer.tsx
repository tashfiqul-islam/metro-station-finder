"use client";

import { Heart } from "lucide-react";
import Link from "next/link";

/**
 * Enhanced minimal footer component
 * Clean design with no rounded corners, optimized for both light and dark modes
 * Sticky positioning with subtle backdrop blur and proper contrast
 */
export function Footer(): React.ReactElement {
  const currentYear = new Date().getFullYear();
  const startYear = 2025;
  const yearDisplay =
    currentYear > startYear ? `${startYear}-${currentYear}` : startYear;

  return (
    <footer className="fixed right-0 bottom-0 left-0 z-30 w-full rounded-none border-border/40 border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/95">
      <div
        className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-3 text-xs sm:flex-row sm:gap-0 sm:px-6 lg:px-8"
        style={{ maxWidth: "80rem" }}
      >
        {/* Left: Brand & Version */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="font-medium text-foreground">
            Metro Station Finder
          </span>
          <span className="text-border/60">•</span>
          <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">
            v1.0.0
          </span>
        </div>

        {/* Center: Quick Links */}
        <nav aria-label="Footer navigation" className="flex items-center gap-6">
          <Link
            className="rounded-sm transition-colors hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href="/about"
          >
            About
          </Link>
          <Link
            className="rounded-sm transition-colors hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href="/about#privacy"
          >
            Privacy
          </Link>
          <Link
            className="rounded-sm transition-colors hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href="/about#attribution"
          >
            Attribution
          </Link>
        </nav>

        {/* Right: Copyright & Attribution */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>© {yearDisplay}</span>
          <span className="text-border/60">•</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="sr-only">Made with love by Tashfiq</span>
            <span aria-hidden="true">Made with</span>
            <Heart
              aria-hidden="true"
              className="h-3 w-3 fill-red-500 text-red-500"
            />
            <span aria-hidden="true">by</span>
            <a
              className="rounded-sm font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href="https://github.com/tashfiqul-islam"
              rel="noopener noreferrer"
              target="_blank"
            >
              Tashfiq
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
