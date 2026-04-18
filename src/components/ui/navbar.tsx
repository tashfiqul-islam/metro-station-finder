import {
  CurrencyCircleDollarIcon,
  GithubLogoIcon,
  HouseIcon,
  InfoIcon,
  ListIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  TrainSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Theme } from "@/components/navbar/theme";
import { Highlight, HighlightItem } from "@/components/ui/highlight";
import { cn } from "@/lib/utils";

interface NavigationItem {
  readonly href: string;
  readonly label: string;
  readonly icon: React.ElementType;
}

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { href: "/", icon: HouseIcon, label: "Home" },
  {
    href: "/station-finder",
    icon: MagnifyingGlassIcon,
    label: "Station Finder",
  },
  {
    href: "/station-fares",
    icon: CurrencyCircleDollarIcon,
    label: "Station Fares",
  },
  { href: "/trip-planner", icon: MapTrifoldIcon, label: "Trip Planner" },
  { href: "/about", icon: InfoIcon, label: "About" },
] as const;

type NavLinkProps = NavigationItem & { isActive: boolean };

const NavLink = memo(
  ({ href, label, icon: Icon, isActive }: NavLinkProps): React.ReactElement => (
    <Link
      activeProps={{ "aria-current": "page" as const }}
      className={cn(
        "group relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
        "cursor-pointer no-underline hover:no-underline",
        "transition-colors duration-200",
        "text-muted-foreground hover:text-foreground",
        "data-[status=active]:font-semibold data-[status=active]:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isActive && "font-semibold text-primary",
      )}
      data-value={href}
      style={{ background: "none", border: "none" }}
      to={href}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "relative z-10 h-3.75 w-3.75 shrink-0 transition-all duration-200",
          "group-hover:scale-110",
          isActive ? "scale-110" : "opacity-60 group-hover:opacity-90",
        )}
        weight={isActive ? "fill" : "duotone"}
      />
      <span className="relative z-10">{label}</span>
    </Link>
  ),
);

NavLink.displayName = "NavLink";

export const NavBar = (): React.ReactElement => {
  const routerState = useRouterState();
  const { pathname } = routerState.location;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  const activeItem = NAVIGATION_ITEMS.find((item) => isActive(item.href));

  return (
    <>
      <header
        className={cn(
          "nav-glass fixed left-0 right-0 top-0 z-50 w-full transition-all duration-500",
          scrolled &&
            "shadow-[0_1px_20px_oklch(0_0_0/6%)] dark:shadow-[0_1px_28px_oklch(0_0_0/22%)]",
        )}
        style={{ height: "var(--header-height)", overflow: "visible" }}
      >
        <nav
          aria-label="Main navigation"
          className="container mx-auto flex h-full items-center justify-between px-4"
          style={{ overflow: "visible" }}
        >
          {/* ── Logo ── */}
          <Link
            aria-label="Metro Station Finder - Home"
            className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            to="/"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 shadow-[inset_0_1px_1px_oklch(1_0_0/12%)] transition-all duration-300 group-hover:border-primary/35 group-hover:bg-primary/15 group-hover:shadow-[0_0_12px_oklch(0.64_0.2_145/0.18)]">
              <TrainSimpleIcon
                aria-hidden="true"
                className="h-4 w-4 text-primary"
                weight="duotone"
              />
            </div>
            <div className="flex flex-col justify-center gap-px leading-none">
              <span className="hidden text-sm font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary sm:block">
                Metro Station Finder
              </span>
              <span className="text-sm font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary sm:hidden">
                MSF
              </span>
              <span className="hidden text-[9px] font-semibold uppercase tracking-[0.14em] text-primary/55 sm:block">
                MRT Line 6
              </span>
            </div>
          </Link>

          {/* ── Desktop nav pill ── */}
          <div className="hidden items-center md:flex">
            <div className="relative isolate flex items-center justify-center rounded-full border border-border/50 bg-background/60 p-1 shadow-[inset_0_1px_2px_oklch(0_0_0/4%)] backdrop-blur-sm">
              <Highlight
                className="inset-0 rounded-full"
                click={false}
                controlledItems
                exitDelay={200}
                hover={false}
                mode="children"
                style={{ backgroundColor: "var(--color-muted)" }}
                transition={{
                  damping: 28,
                  duration: 0.4,
                  stiffness: 280,
                  type: "spring",
                }}
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

          {/* ── Right controls ── */}
          <div className="flex items-center gap-1.5">
            <Theme />

            {/* Vertical divider — desktop only */}
            <div aria-hidden="true" className="mx-1 hidden h-5 w-px bg-border/50 md:block" />

            {/* GitHub */}
            <a
              aria-label="View project on GitHub"
              className={cn(
                "group relative flex h-9 w-9 items-center justify-center rounded-full",
                "border border-border/60 bg-background/70 backdrop-blur-sm",
                "transition-all duration-200",
                "hover:border-primary/30 hover:bg-primary/5",
                "hover:shadow-[0_0_14px_oklch(0.64_0.2_145/0.14)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
              href="https://github.com/tashfiqul-islam/metro-station-finder"
              rel="noopener noreferrer"
              target="_blank"
            >
              <GithubLogoIcon
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground/80 transition-all duration-200 group-hover:scale-110 group-hover:text-foreground"
                weight="fill"
              />
            </a>

            {/* Mobile hamburger */}
            <button
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle mobile menu"
              className={cn(
                "group relative flex h-9 w-9 items-center justify-center rounded-full md:hidden",
                "border border-border/60 bg-background/70 backdrop-blur-sm",
                "transition-all duration-200",
                "hover:border-border hover:bg-accent/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isMobileMenuOpen && "border-primary/30 bg-primary/5",
              )}
              onClick={toggleMobileMenu}
              ref={menuButtonRef}
              type="button"
            >
              {isMobileMenuOpen ? (
                <XIcon aria-hidden="true" className="h-4 w-4 transition-all duration-200" />
              ) : (
                <ListIcon
                  aria-hidden="true"
                  className="h-4 w-4 text-muted-foreground transition-all duration-200 group-hover:text-foreground"
                  weight="regular"
                />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile dropdown — portal to avoid containment clipping ── */}
      {mounted &&
        isMobileMenuOpen &&
        createPortal(
          <nav
            aria-label="Mobile navigation"
            className="glass-card fixed right-4 z-9999 w-64 overflow-hidden rounded-2xl shadow-2xl md:hidden"
            id="mobile-menu"
            ref={menuRef}
            style={{ top: "calc(var(--header-height) + 0.5rem)" }}
          >
            {/* Active route header */}
            {activeItem !== undefined && (
              <div className="flex items-center gap-2.5 border-b border-border/30 px-4 py-3">
                {(() => {
                  const ActiveIcon = activeItem.icon as React.ComponentType<{
                    className?: string;
                    "aria-hidden"?: boolean;
                    weight?: string;
                  }>;
                  return (
                    <ActiveIcon aria-hidden className="h-3.5 w-3.5 text-primary" weight="fill" />
                  );
                })()}
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/70">
                  {activeItem.label}
                </span>
                <div
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70"
                  aria-hidden="true"
                />
              </div>
            )}

            {/* Nav items */}
            <div className="flex flex-col gap-0.5 p-2">
              {NAVIGATION_ITEMS.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon as React.ComponentType<{
                  className?: string;
                  "aria-hidden"?: boolean;
                  weight?: string;
                }>;

                return (
                  <Link
                    aria-current={active ? ("page" as const) : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                      "cursor-pointer no-underline hover:no-underline",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary/8 font-semibold"
                        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                    )}
                    key={item.href}
                    onClick={closeMobileMenu}
                    style={active ? { color: "var(--color-primary)" } : undefined}
                    to={item.href}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                        active
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
                      )}
                    >
                      <Icon
                        aria-hidden={true}
                        className="h-3.5 w-3.5"
                        weight={active ? "fill" : "duotone"}
                      />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                    {active && (
                      <div
                        aria-hidden="true"
                        className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-border/30 px-4 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/45">
                MRT Line 6 · Dhaka Metro
              </p>
            </div>
          </nav>,
          document.body,
        )}
    </>
  );
};
