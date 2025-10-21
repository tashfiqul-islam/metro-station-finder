import type { MetadataRoute } from "next";

/**
 * Robots.txt configuration for Metro Station Finder
 *
 * Features:
 * - Multi-bot support (Google, Bing, Yandex, general crawlers)
 * - Security-focused disallow patterns
 * - SEO-optimized for metro station searches
 * - Type-safe Next.js 16 implementation
 * - Crawl delay optimization
 * - Modern search engine support
 *
 * @returns Complete robots.txt configuration for search engines
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/_next/",
          "/admin/",
          "/private/",
          "/sw.js",
          "/sw.ts",
          "/*.json$",
          "/_vercel/",
          "/vercel.json",
        ],
        crawlDelay: 1,
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/api/",
          "/_next/",
          "/admin/",
          "/private/",
          "/sw.js",
          "/sw.ts",
          "/*.json$",
          "/_vercel/",
          "/vercel.json",
        ],
        crawlDelay: 1,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: [
          "/api/",
          "/_next/",
          "/admin/",
          "/private/",
          "/sw.js",
          "/sw.ts",
          "/*.json$",
          "/_vercel/",
          "/vercel.json",
        ],
        crawlDelay: 2,
      },
      {
        userAgent: "YandexBot",
        allow: "/",
        disallow: [
          "/api/",
          "/_next/",
          "/admin/",
          "/private/",
          "/sw.js",
          "/sw.ts",
          "/*.json$",
          "/_vercel/",
          "/vercel.json",
        ],
        crawlDelay: 2,
      },
      {
        userAgent: "facebookexternalhit",
        allow: "/",
        disallow: ["/api/", "/_next/", "/admin/", "/private/", "/sw.js", "/sw.ts"],
      },
      {
        userAgent: "Twitterbot",
        allow: "/",
        disallow: ["/api/", "/_next/", "/admin/", "/private/", "/sw.js", "/sw.ts"],
      },
    ],
    sitemap: "https://metro-station-finder.vercel.app/sitemap.xml",
    host: "metro-station-finder.vercel.app",
  };
}
