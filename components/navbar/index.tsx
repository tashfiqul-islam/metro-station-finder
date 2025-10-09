"use client";

import { useState } from "react";
import { GithubLink } from "@/components/navbar/github";
import { Links } from "@/components/navbar/links";
import { Logo } from "@/components/navbar/logo";
import { MobileMenu } from "@/components/navbar/mobile-menu";
import { Theme } from "@/components/navbar/theme";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <Links />
        <div className="flex items-center gap-2">
          <Theme />
          <GithubLink />
          <MobileMenu
            isOpen={isMobileMenuOpen}
            onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </div>
      </div>
    </header>
  );
}
