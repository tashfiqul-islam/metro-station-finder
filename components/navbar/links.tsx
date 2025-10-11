"use client";

import { Calculator, Info, MapPin } from "lucide-react";
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
    href: "/about",
    label: "About",
    icon: Info,
  },
] as const;

export function Links() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="hidden items-center gap-1 md:flex"
    >
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            className={cn(
              "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200",
              "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive && "bg-accent/80 font-medium text-foreground"
            )}
            href={item.href}
            key={item.href}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                "h-4 w-4 transition-colors duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-primary"
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
