"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback } from "react";

import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";

export function Logo() {
  const { startPageTransition } = useViewTransitions();

  const handleClick = useCallback(() => {
    startPageTransition(() => {
      // Navigation handled by Next.js Link
    });
  }, [startPageTransition]);

  return (
    <Link
      className="flex items-center gap-2 font-semibold text-foreground text-lg transition-colors hover:text-primary"
      href="/"
      onClick={handleClick}
    >
      <Image
        alt="Metro Station"
        aria-hidden="true"
        className="h-6 w-6"
        height={24}
        src="/metro-station.svg"
        width={24}
      />
      <span className="hidden sm:inline">Metro Station Finder</span>
      <span className="sm:hidden">MSF</span>
    </Link>
  );
}
