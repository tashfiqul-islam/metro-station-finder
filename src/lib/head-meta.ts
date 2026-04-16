/**
 * Utility for generating consistent meta tags and structured data for routes
 */

export interface RouteMeta {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article" | "organization";
}

const SITE_NAME = "Metro Station Finder";
const SITE_URL = "https://metro-station-finder.local";
const SITE_IMAGE = `${SITE_URL}/og-image.png`;
const TWITTER_HANDLE = "@metrofinderapp";

/**
 * Generate meta tags for a route
 */
export const generateRouteMeta = (route: RouteMeta) => {
  const fullTitle = route.title === SITE_NAME ? route.title : `${route.title} | ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${route.path}`;
  const image = route.image || SITE_IMAGE;

  return {
    links: [
      {
        href: canonicalUrl,
        rel: "canonical",
      },
    ],
    meta: [
      { title: fullTitle },
      { content: route.description, name: "description" },
      // Open Graph
      { content: fullTitle, property: "og:title" },
      { content: route.description, property: "og:description" },
      { content: canonicalUrl, property: "og:url" },
      { content: image, property: "og:image" },
      { content: route.type || "website", property: "og:type" },
      { content: SITE_NAME, property: "og:site_name" },
      // Twitter Card
      { content: "summary_large_image", name: "twitter:card" },
      { content: fullTitle, name: "twitter:title" },
      { content: route.description, name: "twitter:description" },
      { content: image, name: "twitter:image" },
      { content: TWITTER_HANDLE, name: "twitter:creator" },
    ],
  };
};

/**
 * Generate JSON-LD structured data for WebPage
 */
export const generateWebPageSchema = (route: RouteMeta) => {
  const canonicalUrl = `${SITE_URL}${route.path}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    description: route.description,
    image: route.image || SITE_IMAGE,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    name: route.title,
    url: canonicalUrl,
  };

  return {
    scripts: [
      {
        children: JSON.stringify(schema),
        type: "application/ld+json",
      },
    ],
  };
};

/**
 * Combine meta tags and structured data for a route
 */
export const generateHeadConfig = (route: RouteMeta) => {
  const meta = generateRouteMeta(route);
  const schema = generateWebPageSchema(route);

  return {
    links: meta.links,
    meta: meta.meta,
    scripts: schema.scripts,
  };
};
