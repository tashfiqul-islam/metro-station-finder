import { useMemo } from "react";

/**
 * Structured Data types for comprehensive SEO optimization
 * Following schema.org standards and Next.js 16 best practices
 */
type BaseStructuredData = {
  readonly "@context": "https://schema.org";
  readonly "@type": string;
};

type OrganizationData = BaseStructuredData & {
  readonly "@type": "Organization";
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly logo?: string;
  readonly email?: string;
  readonly sameAs?: readonly string[];
  readonly contactPoint?: {
    readonly "@type": "ContactPoint";
    readonly contactType: string;
    readonly email?: string;
    readonly url?: string;
  };
  readonly address?: {
    readonly "@type": "PostalAddress";
    readonly addressCountry: string;
    readonly addressLocality: string;
  };
};

type WebApplicationData = BaseStructuredData & {
  readonly "@type": "WebApplication";
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly applicationCategory: string;
  readonly operatingSystem: string;
  readonly offers: {
    readonly "@type": "Offer";
    readonly price: string;
    readonly priceCurrency: string;
  };
  readonly author: OrganizationData;
  readonly publisher: OrganizationData;
  readonly potentialAction?: readonly {
    readonly "@type": "SearchAction";
    readonly target: string;
    readonly "query-input": string;
  }[];
  readonly featureList?: readonly string[];
  readonly screenshot?: string;
  readonly browserRequirements?: string;
};

type TransitStationData = BaseStructuredData & {
  readonly "@type": "TransitStation";
  readonly name: string;
  readonly description: string;
  readonly address: {
    readonly "@type": "PostalAddress";
    readonly addressLocality: string;
    readonly addressRegion: string;
    readonly addressCountry: string;
    readonly streetAddress?: string;
  };
  readonly geo?: {
    readonly "@type": "GeoCoordinates";
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly openingHours?: string;
  readonly amenityFeature?: readonly {
    readonly "@type": "LocationFeatureSpecification";
    readonly name: string;
    readonly value: boolean;
  }[];
  readonly containedInPlace?: {
    readonly "@type": "City";
    readonly name: string;
  };
};

type LocalBusinessData = BaseStructuredData & {
  readonly "@type": "LocalBusiness";
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly telephone?: string;
  readonly address: {
    readonly "@type": "PostalAddress";
    readonly addressLocality: string;
    readonly addressRegion: string;
    readonly addressCountry: string;
  };
  readonly geo?: {
    readonly "@type": "GeoCoordinates";
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly openingHours?: string;
  readonly priceRange?: string;
  readonly paymentAccepted?: readonly string[];
  readonly currenciesAccepted?: string;
  readonly areaServed?: {
    readonly "@type": "City";
    readonly name: string;
  };
};

type BreadcrumbListData = BaseStructuredData & {
  readonly "@type": "BreadcrumbList";
  readonly itemListElement: readonly {
    readonly "@type": "ListItem";
    readonly position: number;
    readonly name: string;
    readonly item: string;
  }[];
};

type FAQData = BaseStructuredData & {
  readonly "@type": "FAQPage";
  readonly mainEntity: readonly {
    readonly "@type": "Question";
    readonly name: string;
    readonly acceptedAnswer: {
      readonly "@type": "Answer";
      readonly text: string;
    };
  }[];
};

type HowToData = BaseStructuredData & {
  readonly "@type": "HowTo";
  readonly name: string;
  readonly description: string;
  readonly step: readonly {
    readonly "@type": "HowToStep";
    readonly name: string;
    readonly text: string;
    readonly url?: string;
  }[];
  readonly totalTime?: string;
  readonly estimatedCost?: {
    readonly "@type": "MonetaryAmount";
    readonly currency: string;
    readonly value: string;
  };
};

type SoftwareApplicationData = BaseStructuredData & {
  readonly "@type": "SoftwareApplication";
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly applicationCategory: string;
  readonly operatingSystem: string;
  readonly offers: {
    readonly "@type": "Offer";
    readonly price: string;
    readonly priceCurrency: string;
  };
  readonly author: OrganizationData;
  readonly publisher: OrganizationData;
  readonly softwareVersion?: string;
  readonly releaseNotes?: string;
  readonly downloadUrl?: string;
  readonly installUrl?: string;
  readonly screenshot?: string;
  readonly featureList?: readonly string[];
  readonly requirements?: string;
  readonly permissions?: string;
  readonly memoryRequirements?: string;
  readonly storageRequirements?: string;
  readonly processorRequirements?: string;
  readonly browserRequirements?: string;
  readonly device?: readonly string[];
  readonly fileFormat?: readonly string[];
  readonly applicationSubCategory?: string;
  readonly softwareHelp?: string;
  readonly softwareRequirements?: string;
  readonly supportingData?: {
    readonly "@type": "DataCatalog";
    readonly name: string;
    readonly description: string;
  };
};

type StructuredDataProps = {
  readonly data:
    | OrganizationData
    | WebApplicationData
    | TransitStationData
    | LocalBusinessData
    | BreadcrumbListData
    | FAQData
    | HowToData
    | SoftwareApplicationData
    | Record<string, unknown>;
  readonly id?: string;
  readonly className?: string;
};

/**
 * Enhanced Structured Data Component for Next.js 16 SEO Optimization
 *
 * Features:
 * - Type-safe structured data with comprehensive schema.org types
 * - Automatic JSON-LD generation with proper formatting
 * - SEO optimization for metro station finder applications
 * - Support for multiple structured data types
 * - Modern React 19.2 patterns with useMemo optimization
 * - Accessibility and performance optimizations
 *
 * @example
 * ```tsx
 * <StructuredData
 *   data={{
 *     "@context": "https://schema.org",
 *     "@type": "WebApplication",
 *     name: "Metro Station Finder",
 *     description: "Find Dhaka metro stations and calculate fares",
 *     url: "https://metro-station-finder.vercel.app",
 *     applicationCategory: "Transportation",
 *     operatingSystem: "Web Browser"
 *   }}
 * />
 * ```
 */
// Server component version for use in layout.tsx and page.tsx
export function StructuredData({ data, id = "structured-data", className }: StructuredDataProps) {
  // Server-side JSON stringification (no memoization needed)
  const jsonLd = JSON.stringify(data, null, 0);

  return (
    <script
      className={className}
      dangerouslySetInnerHTML={{ __html: jsonLd }}
      id={id}
      suppressHydrationWarning
      type="application/ld+json"
    />
  );
}

// Client component version for use in client components
export function StructuredDataClient({
  data,
  id = "structured-data",
  className,
}: StructuredDataProps) {
  // Memoize JSON stringification for performance
  const jsonLd = useMemo(() => {
    try {
      return JSON.stringify(data, null, 0);
    } catch (_error) {
      // Fallback to basic stringification if custom replacer fails
      return JSON.stringify(data);
    }
  }, [data]);

  return (
    <script
      className={className}
      dangerouslySetInnerHTML={{ __html: jsonLd }}
      id={id}
      suppressHydrationWarning
      type="application/ld+json"
    />
  );
}

/**
 * Predefined structured data generators for common metro station finder use cases
 */
export const StructuredDataGenerators = {
  /**
   * Generate Organization structured data for the metro station finder
   */
  organization: (overrides: Partial<OrganizationData> = {}): OrganizationData => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Metro Station Finder",
    description:
      "Find the nearest Dhaka metro station and calculate fares for MRT-6. Your comprehensive guide to Dhaka's metro system.",
    url: "https://metro-station-finder.vercel.app",
    logo: "https://metro-station-finder.vercel.app/metro-station.svg",
    sameAs: [
      "https://github.com/tashfiqul-islam/metro-station-finder",
      "https://github.com/tashfiqul-islam",
      "https://tashfiqul-islam.github.io/metro-station-finder/",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "tashfiq61@gmail.com",
      url: "https://github.com/tashfiqul-islam/metro-station-finder",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "BD",
      addressLocality: "Dhaka",
    },
    ...overrides,
  }),

  /**
   * Generate WebApplication structured data for the metro station finder
   */
  webApplication: (overrides: Partial<WebApplicationData> = {}): WebApplicationData => ({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Metro Station Finder",
    description:
      "Find the nearest Dhaka metro station and calculate fares for MRT-6. Fast, accessible, and easy to use.",
    url: "https://metro-station-finder.vercel.app",
    applicationCategory: "Transportation",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Tashfiqul Islam",
      description: "Product Manager and Developer behind Metro Station Finder",
      email: "tashfiq61@gmail.com",
      url: "https://github.com/tashfiqul-islam",
      sameAs: [
        "https://github.com/tashfiqul-islam",
        "https://tashfiqul-islam.github.io/metro-station-finder/",
      ],
    },
    publisher: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Tashfiqul Islam",
      description: "Product Manager and Developer behind Metro Station Finder",
      email: "tashfiq61@gmail.com",
      url: "https://github.com/tashfiqul-islam",
      sameAs: [
        "https://github.com/tashfiqul-islam",
        "https://tashfiqul-islam.github.io/metro-station-finder/",
      ],
    },
    potentialAction: [
      {
        "@type": "SearchAction",
        target: "https://metro-station-finder.vercel.app/station-finder?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    ],
    featureList: [
      "Find nearest metro station",
      "Calculate fare between stations",
      "Real-time station information",
      "Accessible design",
      "Offline support",
      "Mobile optimized",
    ],
    screenshot: "https://metro-station-finder.vercel.app/screenshot.png",
    browserRequirements: "Requires JavaScript. Works on all modern browsers.",
    ...overrides,
  }),

  /**
   * Generate TransitStation structured data for individual metro stations
   */
  transitStation: (
    stationName: string,
    stationData: {
      readonly description: string;
      readonly address: string;
      readonly latitude: number;
      readonly longitude: number;
      readonly amenities?: readonly string[];
    }
  ): TransitStationData => ({
    "@context": "https://schema.org",
    "@type": "TransitStation",
    name: `${stationName} Metro Station`,
    description: stationData.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Dhaka",
      addressRegion: "Dhaka Division",
      addressCountry: "BD",
      streetAddress: stationData.address,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: stationData.latitude,
      longitude: stationData.longitude,
    },
    openingHours: "Mo-Su 06:00-22:00",
    amenityFeature: stationData.amenities?.map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name: amenity,
      value: true,
    })) || [
      {
        "@type": "LocationFeatureSpecification",
        name: "Accessibility",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Ticket Counter",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Security",
        value: true,
      },
    ],
    containedInPlace: {
      "@type": "City",
      name: "Dhaka",
    },
  }),

  /**
   * Generate FAQ structured data for common metro questions
   */
  faq: (faqs: readonly { question: string; answer: string }[]): FAQData => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }),

  /**
   * Generate BreadcrumbList structured data for navigation
   */
  breadcrumbList: (items: readonly { name: string; url: string }[]): BreadcrumbListData => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }),

  /**
   * Generate HowTo structured data for using the metro system
   */
  howTo: (
    title: string,
    steps: readonly { name: string; text: string; url?: string }[]
  ): HowToData => ({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description: `Step-by-step guide for ${title.toLowerCase()}`,
    step: steps.map((step) => ({
      "@type": "HowToStep",
      name: step.name,
      text: step.text,
      ...(step.url && { url: step.url }),
    })),
    totalTime: "PT5M",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "BDT",
      value: "20-50",
    },
  }),
} as const;

/**
 * Hook for generating metro-specific structured data
 *
 * @example
 * ```tsx
 * const { organizationData, webAppData } = useMetroStructuredData();
 *
 * return (
 *   <>
 *     <StructuredData data={organizationData} />
 *     <StructuredData data={webAppData} />
 *   </>
 * );
 * ```
 */
export function useMetroStructuredData() {
  return useMemo(
    () => ({
      organizationData: StructuredDataGenerators.organization(),
      webAppData: StructuredDataGenerators.webApplication(),
      faqData: StructuredDataGenerators.faq([
        {
          question: "How do I find the nearest metro station?",
          answer:
            "Use our station finder tool to search by location or station name. The app will show you the closest metro station with directions and fare information.",
        },
        {
          question: "What are the metro operating hours?",
          answer: "Dhaka Metro operates from 6:00 AM to 10:00 PM daily, seven days a week.",
        },
        {
          question: "How much does a metro ride cost?",
          answer:
            "Metro fares range from 20-50 BDT depending on the distance traveled. Use our fare calculator to get exact pricing between stations.",
        },
        {
          question: "Is the metro accessible for people with disabilities?",
          answer:
            "Yes, all metro stations are equipped with accessibility features including elevators, ramps, and tactile guidance systems.",
        },
      ]),
      breadcrumbData: StructuredDataGenerators.breadcrumbList([
        { name: "Home", url: "https://metro-station-finder.vercel.app" },
        {
          name: "Station Finder",
          url: "https://metro-station-finder.vercel.app/station-finder",
        },
        {
          name: "Fare Calculator",
          url: "https://metro-station-finder.vercel.app/fare-calculator",
        },
      ]),
    }),
    []
  );
}
