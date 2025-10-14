"use client";

import { Heart } from "lucide-react";
import Link from "next/link";

/**
 * Minimal, modern footer component
 * Clean single-line design with essential information
 * Hidden on mobile devices to avoid redundancy with bottom dock
 */
export function Footer(): React.ReactElement {
  const currentYear = new Date().getFullYear();
  const startYear = 2025;
  const yearDisplay =
    currentYear > startYear ? `${startYear}-${currentYear}` : startYear;

  return (
    <footer className="border-border/40 border-t bg-background/80 backdrop-blur-md">
      <div className="container mx-auto max-w-7xl px-6 py-2">
        <div className="flex items-center justify-between text-[11px]">
          {/* Left: Brand & Version */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="font-medium">Metro Station Finder</span>
            <span className="text-border/60">•</span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">
              v1.0.0
            </span>
          </div>

          {/* Center: Quick Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-4 text-muted-foreground">
              <li>
                <Link
                  className="transition-colors hover:text-primary"
                  href="/about"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  className="transition-colors hover:text-primary"
                  href="/about#privacy"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  className="transition-colors hover:text-primary"
                  href="/about#attribution"
                >
                  Attribution
                </Link>
              </li>
            </ul>
          </nav>

          {/* Right: Copyright & Attribution */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>© {yearDisplay}</span>
            <span className="text-border/60">•</span>
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart
                aria-hidden="true"
                className="h-2.5 w-2.5 fill-red-500 text-red-500"
              />
              <span>by</span>
              <a
                className="font-medium text-primary transition-colors hover:text-primary/80"
                href="https://github.com/tashfiqul-islam"
                rel="noopener noreferrer"
                target="_blank"
              >
                Tashfiq
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
