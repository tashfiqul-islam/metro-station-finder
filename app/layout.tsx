import type { Metadata } from "next";
import { Geist_Mono, Ropa_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const ropaSans = Ropa_Sans({
  variable: "--font-ropa-sans",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
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
    description:
      "Find the nearest metro station and calculate fares for Dhaka MRT-6",
    url: "https://metro-station-finder.vercel.app",
    siteName: "Metro Station Finder",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Metro Station Finder - Dhaka MRT-6",
    description:
      "Find the nearest metro station and calculate fares for Dhaka MRT-6",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="/favicon.ico" rel="icon" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" />
        <meta
          content="#3b82f6"
          media="(prefers-color-scheme: light)"
          name="theme-color"
        />
        <meta
          content="#1e40af"
          media="(prefers-color-scheme: dark)"
          name="theme-color"
        />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
      </head>
      <body
        className={`${ropaSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
