import {
  CurrencyCircleDollarIcon,
  GithubLogoIcon,
  HouseIcon,
  InfoIcon,
  ListIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Theme } from "@/components/navbar/theme";
import { Button } from "@/components/ui/button";
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
        "group relative z-10 flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium",
        "cursor-pointer no-underline hover:no-underline",
        "transition-all duration-200",
        "text-muted-foreground hover:text-foreground",
        "data-[status=active]:bg-foreground/[0.05] data-[status=active]:font-semibold data-[status=active]:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isActive && "bg-foreground/[0.05] font-semibold text-foreground",
      )}
      data-value={href}
      style={{ background: "none", border: "none" }}
      to={href}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "relative z-10 h-3.75 w-3.75 shrink-0 transition-all duration-200",
          "group-hover:scale-105",
          isActive ? "scale-105 text-primary" : "opacity-60 group-hover:opacity-90",
        )}
        weight={isActive ? "fill" : "duotone"}
      />
      <span className="relative z-10">{label}</span>
      {isActive && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />}
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
          "pointer-events-none fixed left-0 right-0 top-0 z-50 w-full transition-all duration-500",
          scrolled &&
            "drop-shadow-[0_14px_34px_oklch(0_0_0/0.10)] dark:drop-shadow-[0_16px_40px_oklch(0_0_0/0.28)]",
        )}
        style={{ height: "var(--header-height)", overflow: "visible" }}
      >
        <nav
          aria-label="Main navigation"
          className="pointer-events-auto container mx-auto flex h-full items-start justify-center px-4 pt-2.5"
          style={{ overflow: "visible" }}
        >
          <div className="flex w-full items-center justify-between border-b border-border/35 px-1 pb-2 dark:border-white/6">
            <div className="flex items-center gap-3 lg:gap-4">
              {/* ── Brand ── */}
              <Link
                aria-label="Metro Station Finder - Home"
                className="group flex items-center gap-3 rounded-full px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                to="/"
              >
                <span className="sr-only">Metro Station Finder</span>
                <div className="hidden sm:block">
                  <img
                    alt=""
                    aria-hidden="true"
                    className="h-12 w-auto dark:hidden"
                    src="/brand/logo/logo-primary-light.svg"
                  />
                  <img
                    alt=""
                    aria-hidden="true"
                    className="hidden h-12 w-auto dark:block"
                    src="/brand/logo/logo-primary-dark.svg"
                  />
                </div>
                <div className="sm:hidden">
                  <img
                    alt=""
                    aria-hidden="true"
                    className="h-9 w-9 dark:hidden"
                    src="/brand/icon/icon-light.svg"
                  />
                  <img
                    alt=""
                    aria-hidden="true"
                    className="hidden h-9 w-9 dark:block"
                    src="/brand/icon/icon-dark.svg"
                  />
                </div>
              </Link>

              {/* ── Desktop nav ── */}
              <div className="hidden items-center lg:flex">
                <div className="relative isolate flex items-center justify-center gap-0.5 rounded-full border border-border/45 bg-background/72 p-1 backdrop-blur-sm dark:bg-background/48">
                  {NAVIGATION_ITEMS.map((item) => (
                    <NavLink {...item} isActive={isActive(item.href)} key={item.href} />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Controls ── */}
            <div className="flex items-center gap-1.5">
              <div className="hidden items-center gap-2 lg:flex">
                <Button
                  asChild={<Link to="/login">Log in</Link>}
                  className="rounded-full px-4 text-sm font-medium"
                  size="sm"
                  variant="ghost"
                />
                <Button
                  asChild={<Link to="/signup">Sign up</Link>}
                  className="rounded-full px-4 text-sm font-semibold shadow-[0_10px_24px_oklch(0.44_0.145_145_/_0.20)]"
                  size="sm"
                  variant="primary"
                />
              </div>

              <Theme />

              <div aria-hidden="true" className="mx-1 hidden h-5 w-px bg-border/45 lg:block" />

              {/* GitHub */}
              <a
                aria-label="View project on GitHub"
                className={cn(
                  "group relative hidden h-9 w-9 items-center justify-center rounded-full lg:flex",
                  "border border-border/45 bg-background/72 dark:bg-background/48",
                  "transition-all duration-200",
                  "hover:border-primary/18 hover:bg-foreground/[0.035]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
                href="https://github.com/tashfiqul-islam/metro-station-finder"
                rel="noopener noreferrer"
                target="_blank"
              >
                <GithubLogoIcon
                  aria-hidden="true"
                  className="h-4 w-4 text-muted-foreground/78 transition-all duration-200 group-hover:scale-105 group-hover:text-foreground"
                  weight="fill"
                />
              </a>

              {/* Mobile hamburger */}
              <button
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle mobile menu"
                className={cn(
                  "group relative flex h-9 w-9 items-center justify-center rounded-full lg:hidden",
                  "border border-border/45 bg-background/72 dark:bg-background/48",
                  "transition-all duration-200",
                  "hover:border-primary/18 hover:bg-foreground/[0.035]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isMobileMenuOpen && "border-primary/30 bg-primary/6",
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
          </div>
        </nav>
      </header>

      {/* ── Mobile dropdown — portal to avoid containment clipping ── */}
      {mounted &&
        isMobileMenuOpen &&
        createPortal(
          <nav
            aria-label="Mobile navigation"
            className="fixed right-4 z-9999 w-74 overflow-hidden rounded-[1.75rem] border border-border/45 bg-background/94 shadow-[0_24px_90px_oklch(0_0_0/0.18)] backdrop-blur-2xl dark:bg-background/88 md:hidden"
            id="mobile-menu"
            ref={menuRef}
            style={{ top: "calc(var(--header-height) + 0.5rem)" }}
          >
            {/* Active route header */}
            {activeItem !== undefined && (
              <div className="flex items-center gap-2.5 border-b border-border/30 px-4 py-3.5">
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
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                  {activeItem.label}
                </span>
                <div
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-primary/70"
                  aria-hidden="true"
                />
              </div>
            )}

            {/* Nav items */}
            <div className="flex flex-col gap-1 p-2.5">
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
                        ? "bg-primary/7 font-semibold"
                        : "text-muted-foreground hover:bg-foreground/[0.035] hover:text-foreground",
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
                          ? "bg-primary/12 text-primary"
                          : "bg-muted/55 text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
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
            <div className="border-t border-border/30 px-4 py-3">
              <div className="mb-3 flex gap-2">
                <Button
                  asChild={<Link to="/login">Log in</Link>}
                  className="flex-1 rounded-full"
                  size="sm"
                  variant="outline"
                />
                <Button
                  asChild={<Link to="/signup">Sign up</Link>}
                  className="flex-1 rounded-full"
                  size="sm"
                  variant="primary"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/45">
                  Dhaka MRT-6
                </p>
                <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/35">
                  metro-station-finder
                </span>
              </div>
            </div>
          </nav>,
          document.body,
        )}
    </>
  );
};
