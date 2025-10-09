"use client";

import { Train } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link
      className="flex items-center gap-2 font-semibold text-foreground text-lg transition-colors hover:text-primary"
      href="/"
    >
      <Train aria-hidden="true" className="h-6 w-6 text-primary" />
      <span className="hidden sm:inline">Metro Station Finder</span>
      <span className="sm:hidden">MSF</span>
    </Link>
  );
}
