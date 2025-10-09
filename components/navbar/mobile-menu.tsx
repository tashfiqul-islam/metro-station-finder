"use client";

import { Calculator, Info, MapPin, Menu, Play, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    href: "/station-finder",
    label: "Stations",
    icon: MapPin,
  },
  {
    href: "/fare-calculator",
    label: "Fares",
    icon: Calculator,
  },
  {
    href: "/demo",
    label: "Demo",
    icon: Play,
  },
  {
    href: "/about",
    label: "About",
    icon: Info,
  },
] as const;

type MobileMenuProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export function MobileMenu({ isOpen, onToggle }: MobileMenuProps) {
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        aria-expanded={isOpen}
        aria-label="Toggle menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        onClick={onToggle}
        type="button"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="absolute top-16 right-0 left-0 z-50 border-b bg-background shadow-lg">
          <nav className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive && "bg-accent/80 font-medium text-primary"
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={onToggle}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "h-4 w-4",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
