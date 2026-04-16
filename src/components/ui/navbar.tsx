import { Calculator, House, Info, List, MapPin, Path, Train, X } from "@phosphor-icons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { GithubLink } from "@/components/navbar/github";
import { Theme } from "@/components/navbar/theme";
import { Highlight, HighlightItem } from "@/components/ui/highlight";
import { cn } from "@/lib/utils";

interface NavigationItem {
  readonly href: string;
  readonly label: string;
  readonly icon: React.ElementType;
}

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { href: "/", icon: House, label: "Home" },
  { href: "/station-finder", icon: MapPin, label: "Station Finder" },
  { href: "/station-fares", icon: Calculator, label: "Station Fares" },
  { href: "/trip-planner", icon: Path, label: "Trip Planner" },
  { href: "/about", icon: Info, label: "About" },
] as const;

type NavLinkProps = NavigationItem & { isActive: boolean };

const NavLink = memo(
  ({ href, label, icon: Icon, isActive }: NavLinkProps): React.ReactElement => (
    <Link
      activeProps={{ "aria-current": "page" as const }}
      className={cn(
        "group relative z-10 flex items-center gap-2 rounded-full px-2.5 py-1.5 font-medium text-sm transition-all duration-200",
        "cursor-pointer no-underline hover:no-underline",
        "text-muted-foreground data-[status=active]:font-semibold data-[status=active]:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive && "font-semibold text-primary",
      )}
      data-value={href}
      style={{ background: "none", border: "none" }}
      to={href}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "relative z-10 h-4 w-4 transition-all duration-200",
          "group-hover:scale-110",
          isActive && "scale-110",
        )}
      />
      <span className="relative z-10 transition-colors duration-200">{label}</span>
    </Link>
  ),
);

NavLink.displayName = "NavLink";

export const NavBar = (): React.ReactElement => {
  const routerState = useRouterState();
  const { pathname } = routerState.location;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

  const isActive = (href: string): boolean => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const getActiveValue = (): string =>
    NAVIGATION_ITEMS.find((item) => isActive(item.href))?.href ?? pathname;

  const toggleMobileMenu = (): void => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = (): void => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className="fixed top-0 right-0 left-0 z-50 w-full border border-white/17 border-b backdrop-blur-[5.7px] dark:border-white/10 dark:bg-black/30 dark:backdrop-blur-2xl"
        style={{
          WebkitBackdropFilter: "blur(5.7px)",
          backgroundColor: "rgba(255, 255, 255, 0.19)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
          height: "var(--header-height)",
          overflow: "visible",
        }}
      >
        <nav
          aria-label="Main navigation"
          className="container mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
          style={{ overflow: "visible" }}
        >
          {/* Logo */}
          <div className="flex items-center">
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
              <Train aria-hidden="true" className="h-6 w-6 shrink-0" weight="duotone" />
              <span className="hidden sm:inline">Metro Station Finder</span>
              <span className="sm:hidden">MSF</span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            <div
              className="relative isolate flex items-center justify-center rounded-full border border-border/40 p-1"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
                borderRadius: "9999px",
              }}
            >
              <Highlight
                className="inset-0 rounded-full"
                click={false}
                controlledItems
                exitDelay={200}
                hover={false}
                mode="children"
                style={{ backgroundColor: "var(--color-muted)" }}
                transition={{ duration: 0.5, type: "spring" }}
                value={getActiveValue()}
              >
                {NAVIGATION_ITEMS.map((item) => (
                  <HighlightItem key={item.href} value={item.href}>
                    <NavLink {...item} isActive={isActive(item.href)} />
                  </HighlightItem>
                ))}
              </Highlight>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <Theme />
            {/* Mobile hamburger */}
            <div className="relative md:hidden">
              <button
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle mobile menu"
                className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-input bg-background transition-all duration-200 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={toggleMobileMenu}
                ref={menuButtonRef}
                style={{
                  backgroundColor: "var(--color-background)",
                  borderColor: "var(--color-border)",
                }}
                type="button"
              >
                {isMobileMenuOpen ? (
                  <X
                    aria-hidden="true"
                    className="h-4 w-4 transition-all duration-200 group-hover:scale-110"
                  />
                ) : (
                  <List
                    aria-hidden="true"
                    className="h-4 w-4 transition-all duration-200 group-hover:scale-110"
                  />
                )}
              </button>
            </div>
            <GithubLink />
          </div>
        </nav>
      </header>

      {/* Mobile dropdown — portal outside header to avoid containment clipping */}
      {mounted &&
        isMobileMenuOpen &&
        createPortal(
          <nav
            aria-label="Mobile navigation"
            className="fixed top-[calc(var(--header-height)+0.5rem)] right-4 z-[9999] min-w-[200px] rounded-xl border border-white/17 p-2 shadow-lg backdrop-blur-[5.7px] md:hidden dark:border-white/10 dark:bg-black/30 dark:backdrop-blur-2xl"
            id="mobile-menu"
            ref={menuRef}
            style={{
              WebkitBackdropFilter: "blur(5.7px)",
              backdropFilter: "blur(5.7px)",
              backgroundColor: "rgba(255, 255, 255, 0.19)",
              boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="flex flex-col gap-1">
              {NAVIGATION_ITEMS.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon as React.ComponentType<{
                  className?: string;
                  "aria-hidden"?: boolean;
                }>;

                return (
                  <Link
                    aria-current={active ? ("page" as const) : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "cursor-pointer no-underline hover:no-underline",
                      active
                        ? "bg-accent/50 font-semibold"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-primary",
                    )}
                    key={item.href}
                    onClick={closeMobileMenu}
                    style={active ? { color: "var(--color-primary)" } : undefined}
                    to={item.href}
                  >
                    <Icon
                      aria-hidden={true}
                      className={cn("h-4 w-4 shrink-0", active && "scale-110")}
                    />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>,
          document.body,
        )}
    </>
  );
};
