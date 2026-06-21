import { WarningCircleIcon } from "@phosphor-icons/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect, useState } from "react";

import { UnifiedBackground } from "@/components/common/unified-background";
import { NavBar } from "@/components/ui/navbar";
import { reportWebVitals } from "@/lib/web-vitals";
import appCss from "../styles.css?url";

// ─── QueryClient constants (named for readability, matching legacy) ────────────
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

const STALE_TIME_HOURS = 1;
const GC_TIME_DAYS = 1;
const QUERY_RETRY_COUNT = 2;
const MUTATION_RETRY_COUNT = 1;

const NotFoundComponent = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4">
    <WarningCircleIcon className="h-16 w-16 text-yellow-600 dark:text-yellow-500" weight="fill" />
    <h1 className="font-bold text-4xl">404</h1>
    <p className="text-lg text-muted-foreground">Page not found</p>
    <Link className="text-primary underline hover:no-underline" to="/">
      Go home
    </Link>
  </div>
);

const ErrorComponent = ({ error }: { error: Error }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
    <WarningCircleIcon className="h-16 w-16 text-red-500" weight="fill" />
    <h1 className="font-bold text-4xl">Something went wrong</h1>
    <p className="max-w-md text-center text-lg text-muted-foreground">
      {error.message || "An unexpected error occurred. Please try again later."}
    </p>
    <Link className="text-primary underline hover:no-underline" to="/">
      Go home
    </Link>
  </div>
);

const PendingComponent = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

// ─── Root shell ────────────────────────────────────────────────────────────────
const RootDocument = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { retry: MUTATION_RETRY_COUNT },
          queries: {
            gcTime:
              MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY * GC_TIME_DAYS,
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
            retry: QUERY_RETRY_COUNT,
            staleTime: MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * STALE_TIME_HOURS,
          },
        },
      }),
  );

  useEffect(() => {
    reportWebVitals();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FOUC-blocking inline script — dangerouslySetInnerHTML exception
            documented here: must run synchronously before first paint to
            read localStorage and apply the correct theme class/attribute.
            No CSP nonce is needed in dev; for production, wire a nonce via
            the server response header and the `nonce` attribute on this element. */}
        <script
          // oxlint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("theme");var t=(s==="light"||s==="dark"||s==="system")?s:"system";var g=function(){return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";};var e=t==="system"?g():t;document.documentElement.setAttribute("data-theme",e);document.documentElement.classList.remove("light","dark");document.documentElement.classList.add(e);}catch(err){var e2=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",e2);document.documentElement.classList.remove("light","dark");document.documentElement.classList.add(e2);}})();`,
          }}
        />
        <HeadContent />
      </head>
      <body className="relative min-h-screen bg-background">
        <QueryClientProvider client={queryClient}>
          <UnifiedBackground />
          <NavBar />
          <main
            className="relative z-10"
            style={{
              paddingBottom: "var(--footer-height, 0)",
              paddingTop: "var(--header-height)",
            }}
          >
            {children}
          </main>
          {import.meta.env.DEV && (
            <>
              <TanStackDevtools
                config={{ position: "bottom-right" }}
                plugins={[
                  {
                    name: "Tanstack Router",
                    render: <TanStackRouterDevtoolsPanel />,
                  },
                ]}
              />
              <ReactQueryDevtools initialIsOpen={false} />
            </>
          )}
          <Scripts />
        </QueryClientProvider>
      </body>
    </html>
  );
};

// ─── Route definition ─────────────────────────────────────────────────────────
/* v8 ignore next -- framework route registration glue */
export const Route = createRootRoute({
  errorComponent: ErrorComponent,
  head: () => ({
    links: [
      { href: appCss, rel: "stylesheet" },
      { href: "/manifest.json", rel: "manifest" },
      {
        href: "/brand/icon/icon-light.svg",
        media: "(prefers-color-scheme: light)",
        rel: "icon",
        type: "image/svg+xml",
      },
      {
        href: "/brand/icon/icon-dark.svg",
        media: "(prefers-color-scheme: dark)",
        rel: "icon",
        type: "image/svg+xml",
      },
      { href: "/brand/favicon/favicon-32.png", rel: "icon", sizes: "32x32", type: "image/png" },
      { href: "/brand/favicon/favicon-16.png", rel: "icon", sizes: "16x16", type: "image/png" },
      {
        href: "/brand/favicon/apple-touch-icon.png",
        rel: "apple-touch-icon",
        sizes: "180x180",
      },
    ],
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      {
        content:
          "Find the nearest metro station in Dhaka (MRT-6), calculate fares, and browse station information.",
        name: "description",
      },
      { title: "Metro Station Finder - Dhaka MRT-6" },
    ],
  }),
  loader: () => ({}),
  notFoundComponent: NotFoundComponent,
  pendingComponent: PendingComponent,
  shellComponent: RootDocument,
});
