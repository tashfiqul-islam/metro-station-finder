"use client";

import { Calculator, Home, Info, MapPin } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { memo } from "react";
import { GithubGlimpse } from "@/app/_components/shared/navbar/github-glimpse";
import { Logo } from "@/app/_components/shared/navbar/logo";
import { Theme } from "@/app/_components/shared/navbar/theme";
import { cn } from "@/lib/utils";

/**
 * Navigation item configuration type
 */
type NavigationItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: React.ElementType;
};

/**
 * Navigation items configuration
 */
const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
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

/**
 * Navigation link component with active state and smooth transitions
 */
const NavLink = memo(
  ({
    href,
    label,
    icon: Icon,
    isActive,
  }: NavigationItem & {
    readonly isActive: boolean;
  }): React.ReactElement => {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      router.push(href);
    };

    return (
      <a
        className={cn(
          "group relative flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-sm transition-all duration-200",
          "hover:bg-accent/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "cursor-pointer",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
        href={href}
        onClick={handleClick}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
            isActive && "text-primary"
          )}
        />
        <span>{label}</span>
        {isActive && (
          <span className="-bottom-px absolute inset-x-3 h-0.5 bg-linear-to-r from-primary/0 via-primary to-primary/0" />
        )}
      </a>
    );
  }
);

NavLink.displayName = "NavLink";

/**
 * Modern navigation bar component
 * Features clean design, micro-interactions, and responsive behavior
 */
export function NavBar(): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header
      className="fixed top-0 right-0 left-0 z-50 w-full border-border/40 border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60"
      style={{ height: "var(--header-height)" }}
    >
      <nav
        aria-label="Main navigation"
        className="container mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        {/* Logo */}
        <div className="flex items-center">
          <Logo />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {NAVIGATION_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} isActive={pathname === item.href} />
          ))}
        </div>

        {/* Utilities */}
        <div className="flex items-center gap-2">
          <Theme />
          <GithubGlimpse />
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="border-border/40 border-t bg-background/80 backdrop-blur-md md:hidden"
      >
        <div className="container mx-auto flex items-center justify-around px-2 py-2 pb-safe">
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const handleClick = (e: React.MouseEvent) => {
              e.preventDefault();
              router.push(item.href);
            };

            return (
              <a
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-all duration-200",
                  "hover:bg-accent/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "cursor-pointer",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                href={item.href}
                key={item.href}
                onClick={handleClick}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                />
                <span className="font-medium text-[10px]">{item.label}</span>
                {isActive && (
                  <span className="-bottom-px -translate-x-1/2 absolute left-1/2 h-0.5 w-8 bg-linear-to-r from-transparent via-primary to-transparent" />
                )}
              </a>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
