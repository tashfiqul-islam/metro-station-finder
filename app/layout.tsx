import type { Metadata } from "next";
import { Geist_Mono, Ropa_Sans } from "next/font/google";
import { WebVitalsMonitor } from "@/app/_components/shared/metrics/web-vitals-monitor";
// Footer temporarily removed; component file deleted
import { NavBar } from "@/app/_components/shared/navigation/nav-bar";
import { Providers } from "@/app/_components/shared/providers/providers";
import {
  StructuredData,
  StructuredDataGenerators,
} from "@/app/_components/shared/seo/structured-data";
import "./input.css";
import "./globals.css";

const ropaSans = Ropa_Sans({
  variable: "--font-ropa-sans",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Only preload the primary font
  adjustFontFallback: true,
  fallback: ["Courier New", "monospace"],
});

export const metadata: Metadata = {
  title: "Metro Station Finder - Dhaka MRT-6",
  description:
    "Find the nearest metro station and calculate fares for Dhaka MRT-6. Real-time station search, fare calculation, and route planning.",
  keywords: [
    "metro",
    "station",
    "finder",
    "dhaka",
    "mrt-6",
    "fare",
    "calculator",
    "transportation",
  ],
  authors: [{ name: "Metro Station Finder Team" }],
  creator: "Metro Station Finder",
  publisher: "Metro Station Finder",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://metro-station-finder.vercel.app"),
  openGraph: {
    title: "Metro Station Finder - Dhaka MRT-6",
    description: "Find the nearest metro station and calculate fares for Dhaka MRT-6",
    url: "https://metro-station-finder.vercel.app",
    siteName: "Metro Station Finder",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Metro Station Finder - Dhaka MRT-6",
    description: "Find the nearest metro station and calculate fares for Dhaka MRT-6",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon?192x192", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon?512x512", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/icons/shortcut-station", sizes: "96x96", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/apple-icon",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="en" suppressHydrationWarning>
      <head>
        <link href="/manifest.json" rel="manifest" />
        <meta content="#3b82f6" media="(prefers-color-scheme: light)" name="theme-color" />
        <meta content="#1e40af" media="(prefers-color-scheme: dark)" name="theme-color" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        {/* Security headers via meta tags for static export */}
        <meta content="nosniff" httpEquiv="X-Content-Type-Options" />
        <meta content="DENY" httpEquiv="X-Frame-Options" />
        <meta content="1; mode=block" httpEquiv="X-XSS-Protection" />
        <meta content="strict-origin-when-cross-origin" httpEquiv="Referrer-Policy" />
        <meta
          content="camera=(), microphone=(), geolocation=(), browsing-topics=()"
          httpEquiv="Permissions-Policy"
        />
        <meta
          content="max-age=31536000; includeSubDomains; preload"
          httpEquiv="Strict-Transport-Security"
        />
        <meta
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://maps.googleapis.com; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';"
          httpEquiv="Content-Security-Policy"
        />

        {/* Resource hints for better performance */}
        <link href="//maps.googleapis.com" rel="dns-prefetch" />
        <link href="//maps.gstatic.com" rel="dns-prefetch" />

        {/* Preload critical resources for instant LCP */}
        <link as="image" href="/favicon.ico" rel="preload" />
        <link as="fetch" crossOrigin="anonymous" href="/manifest.json" rel="preload" />

        {/* next/font handles font optimization automatically */}
        {/* Critical CSS is now handled by Tailwind v4 in src/input.css */}

        {/* Global JSON-LD Structured Data for SEO */}
        <StructuredData data={StructuredDataGenerators.organization()} />
        <StructuredData data={StructuredDataGenerators.webApplication()} />
      </head>
      <body
        className={`${ropaSans.variable} ${geistMono.variable} min-h-dvh bg-background font-ropa-sans text-foreground antialiased`}
      >
        <Providers>
          <NavBar />
          <main className="min-h-[calc(100dvh-var(--header-height))] pt-(--header-height)">
            {children}
          </main>
          {/* Footer removed (component deleted) */}
          <WebVitalsMonitor />
        </Providers>
      </body>
    </html>
  );
}
