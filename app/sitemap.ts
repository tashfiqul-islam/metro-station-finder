import type { MetadataRoute } from "next";
import { generateSitemapData } from "@/lib/services/seo/metadata";

/**
 * Dynamic sitemap generation for Metro Station Finder
 *
 * Features:
 * - Automatic station page generation
 * - Optimized priorities and change frequencies
 * - Type-safe implementation with Next.js 16
 * - SEO-optimized for Bangladesh metro searches
 * - Performance monitoring and caching
 * - Error handling and fallbacks
 * - Modern sitemap standards compliance
 *
 * @returns Complete sitemap for search engine indexing
 */
export default function sitemap(): MetadataRoute.Sitemap {
  try {
    // Generate sitemap data with error handling
    const sitemapData = generateSitemapData();

    // Validate sitemap data
    if (!Array.isArray(sitemapData) || sitemapData.length === 0) {
      // Return minimal fallback sitemap for invalid data
      return [
        {
          url: "https://metro-station-finder.vercel.app",
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 1.0,
        },
      ];
    }

    return sitemapData;
  } catch {
    // Error handling for sitemap generation
    // Return minimal fallback sitemap
    return [
      {
        url: "https://metro-station-finder.vercel.app",
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 1.0,
      },
    ];
  }
}
