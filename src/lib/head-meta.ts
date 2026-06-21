/**
 * Utility for generating consistent meta tags and structured data for routes
 */

export interface RouteMeta {
  description: string;
  title: string;
  path: string;
  image?: string;
  type?: "website" | "article" | "organization";
}

const SITE_NAME = "Metro Station Finder";
const DEFAULT_SITE_URL = "http://localhost:3000";
const SITE_URL = (import.meta.env["VITE_SITE_URL"] || DEFAULT_SITE_URL).replace(/\/$/u, "");
const SITE_IMAGE = "/og-image.svg";
const TWITTER_HANDLE = import.meta.env["VITE_TWITTER_HANDLE"];

const getCanonicalUrl = (path: string): string => `${SITE_URL}${path}`;

const getImageUrl = (image?: string): string => {
  const assetPath = image || SITE_IMAGE;
  if (assetPath.startsWith("http://") || assetPath.startsWith("https://")) {
    return assetPath;
  }
  return `${SITE_URL}${assetPath}`;
};

/**
 * Generate meta tags for a route
 */
export const generateRouteMeta = (route: RouteMeta) => {
  const fullTitle = route.title === SITE_NAME ? route.title : `${route.title} | ${SITE_NAME}`;
  const canonicalUrl = getCanonicalUrl(route.path);
  const image = getImageUrl(route.image);

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
      ...(TWITTER_HANDLE ? [{ content: TWITTER_HANDLE, name: "twitter:creator" }] : []),
    ],
  };
};

/**
 * Generate JSON-LD structured data for WebPage
 */
export const generateWebPageSchema = (route: RouteMeta) => {
  const canonicalUrl = getCanonicalUrl(route.path);

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    description: route.description,
    image: getImageUrl(route.image),
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
