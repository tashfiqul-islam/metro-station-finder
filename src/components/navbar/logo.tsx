import { TrainIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export const Logo = () => (
  <Link
    aria-label="Metro Station Finder - Home"
    className={cn(
      "flex items-center gap-2",
      "font-semibold text-foreground text-lg",
      "transition-colors duration-200",
      "hover:text-primary",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    )}
    to="/"
  >
    <TrainIcon aria-hidden="true" className="h-6 w-6 shrink-0 text-foreground" weight="duotone" />
    <span className="hidden sm:inline">Metro Station Finder</span>
    <span className="sm:hidden">MSF</span>
  </Link>
);
