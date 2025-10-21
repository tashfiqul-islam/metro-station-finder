import type { Metadata } from "next";

/**
 * SEO Configuration for Metro Station Finder
 * Optimized for Bangladesh metro station searches and Next.js 16
 */

export const SITE_CONFIG = {
  name: "Metro Station Finder",
  description:
    "Find the nearest Dhaka metro station and calculate fares for MRT-6. Fast, accessible, and easy to use.",
  url: "https://metro-station-finder.vercel.app",
  ogImage: "https://metro-station-finder.vercel.app/og-image.png",
  twitterHandle: "@tashfiqul_islam",
  creator: "Tashfiqul Islam",
  publisher: "Tashfiqul Islam",
  authorEmail: "tashfiq61@gmail.com",
  githubUrl: "https://github.com/tashfiqul-islam/metro-station-finder",
  authorUrl: "https://github.com/tashfiqul-islam",
} as const;

export const KEYWORDS = [
  // Primary keywords
  "Dhaka metro",
  "metro station",
  "MRT-6",
  "fare calculator",
  "metro finder",
  "Dhaka transport",

  // Location-specific keywords
  "Bangladesh metro",
  "Dhaka metro rail",
  "metro station finder",
  "nearest metro station",
  "metro navigation",
  "public transport Dhaka",

  // Station-specific keywords
  "Uttara metro station",
  "Motijheel metro station",
  "Farmgate metro station",
  "Shahbagh metro station",
  "Dhaka University metro",
  "Mirpur metro station",
  "Pallabi metro station",
  "Agargaon metro station",
  "Karwan Bazar metro",
  "Bijoy Sarani metro",

  // Service keywords
  "metro fare calculator",
  "metro route planner",
  "metro station locator",
  "metro timing",
  "metro schedule",
  "metro map",
  "metro guide",

  // Accessibility keywords
  "accessible metro",
  "metro for disabled",
  "metro accessibility",
  "metro facilities",

  // Technical keywords
  "metro app",
  "metro website",
  "metro online",
  "metro digital",
  "metro technology",
] as const;

export const STATION_KEYWORDS = {
  "Uttara North": ["Uttara North metro", "Diabari metro", "Uttara metro station"],
  "Uttara Center": ["Uttara Center metro", "Uttara commercial metro"],
  "Uttara South": ["Uttara South metro", "Uttara residential metro"],
  Pallabi: ["Pallabi metro", "Pallabi station", "Pallabi metro rail"],
  "Mirpur 11": ["Mirpur 11 metro", "Mirpur metro station"],
  "Mirpur 10": ["Mirpur 10 metro", "cricket stadium metro"],
  Kazipara: ["Kazipara metro", "Kazipara station"],
  Shewrapara: ["Shewrapara metro", "Shewrapara station"],
  Agargaon: ["Agargaon metro", "government office metro", "NICVD metro"],
  "Bijoy Sarani": ["Bijoy Sarani metro", "Military Museum metro"],
  Farmgate: ["Farmgate metro", "commercial hub metro", "shopping mall metro"],
  "Karwan Bazar": ["Karwan Bazar metro", "wholesale market metro"],
  Shahbagh: ["Shahbagh metro", "Dhaka Medical College metro", "University metro"],
  "Dhaka University": ["Dhaka University metro", "university campus metro"],
  "Bangladesh Secretariat": ["Secretariat metro", "government office metro"],
  Motijheel: ["Motijheel metro", "business district metro", "CBD metro"],
} as const;

/**
 * Generate comprehensive metadata for different pages
 */
export function generateMetadata({
  title,
  description,
  keywords = [],
  path = "",
  image = SITE_CONFIG.ogImage,
}: {
  title: string;
  description: string;
  keywords?: readonly string[];
  path?: string;
  image?: string;
}): Metadata {
  const fullTitle = `${title} | ${SITE_CONFIG.name}`;
  const fullUrl = `${SITE_CONFIG.url}${path}`;
  const allKeywords = [...KEYWORDS, ...keywords];

  return {
    title: fullTitle,
    description,
    keywords: allKeywords,
    authors: [
      {
        name: SITE_CONFIG.creator,
      },
    ],
    creator: SITE_CONFIG.creator,
    publisher: SITE_CONFIG.publisher,

    // Open Graph
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      locale: "en_US",
      siteName: SITE_CONFIG.name,
      url: fullUrl,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },

    // Twitter
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      creator: SITE_CONFIG.twitterHandle,
      images: [image],
    },

    // Additional metadata
    alternates: {
      canonical: fullUrl,
    },

    // Mobile and app metadata
    other: {
      "application-name": SITE_CONFIG.name,
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
      "apple-mobile-web-app-title": SITE_CONFIG.name,
      "msapplication-TileColor": "#2563eb",
      "theme-color": "#2563eb",
    },

    // Robots
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

    // Verification
    verification: {
      google: "your-google-verification-code",
      yandex: "your-yandex-verification-code",
      yahoo: "your-yahoo-verification-code",
    },
  };
}

/**
 * Generate station-specific metadata
 */
export function generateStationMetadata(stationName: string) {
  const stationKeywords = STATION_KEYWORDS[stationName as keyof typeof STATION_KEYWORDS] || [];

  return generateMetadata({
    title: `${stationName} Metro Station - Location, Facilities & Fares`,
    description: `Find ${stationName} metro station location, facilities, and fare information. Get directions and calculate fares from ${stationName} to other stations.`,
    keywords: stationKeywords,
    path: `/station/${stationName.toLowerCase().replace(/\s+/g, "-")}`,
  });
}

/**
 * Generate fare calculator metadata
 */
export function generateFareCalculatorMetadata() {
  return generateMetadata({
    title: "Metro Fare Calculator - Calculate Dhaka Metro Fares",
    description:
      "Calculate metro fares between any two stations on MRT-6. Get accurate pricing and route information for your metro journey.",
    keywords: ["metro fare calculator", "fare calculation", "metro pricing", "metro cost"],
    path: "/fare-calculator",
  });
}

/**
 * Generate station finder metadata
 */
export function generateStationFinderMetadata() {
  return generateMetadata({
    title: "Find Nearest Metro Station - Dhaka Metro Station Locator",
    description:
      "Find the nearest metro station to your location. Get directions, facilities, and real-time information for all MRT-6 stations.",
    keywords: [
      "nearest metro station",
      "metro station locator",
      "find metro station",
      "metro station finder",
    ],
    path: "/station-finder",
  });
}

/**
 * Generate about page metadata
 */
export function generateAboutMetadata() {
  return generateMetadata({
    title: "About Metro Station Finder - Your Guide to Dhaka Metro",
    description:
      "Learn about Metro Station Finder, your comprehensive guide to Dhaka's metro system. Features, accessibility, and how we help commuters.",
    keywords: ["about metro finder", "metro guide", "metro information", "metro help"],
    path: "/about",
  });
}

/**
 * Generate comprehensive sitemap data for better SEO
 *
 * Features:
 * - Dynamic station page generation
 * - Optimized priorities and change frequencies
 * - Performance monitoring
 * - Error handling and validation
 * - Modern sitemap standards compliance
 */
export function generateSitemapData() {
  const baseUrl = SITE_CONFIG.url;
  const currentDate = new Date();

  // Core pages with optimized SEO settings
  const corePages = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/station-finder`,
      lastModified: currentDate,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/fare-calculator`,
      lastModified: currentDate,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ];

  // Station-specific pages with dynamic generation
  const stationPages = Object.keys(STATION_KEYWORDS).map((station) => {
    const stationSlug = station.toLowerCase().replace(/\s+/g, "-");
    return {
      url: `${baseUrl}/station/${stationSlug}`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  // Additional SEO-optimized pages
  const additionalPages = [
    {
      url: `${baseUrl}/station-finder?q=uttara`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/station-finder?q=farmgate`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/station-finder?q=motijheel`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/fare-calculator?from=uttara-north&to=motijheel`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    },
  ];

  // Combine all pages
  const allPages = [...corePages, ...stationPages, ...additionalPages];

  // Validate sitemap entries
  const validatedPages = allPages.filter((page) => {
    // Basic validation
    if (!(page.url && page.lastModified)) {
      return false;
    }

    // URL validation
    try {
      new URL(page.url);
      return true;
    } catch {
      return false;
    }
  });

  return validatedPages;
}
