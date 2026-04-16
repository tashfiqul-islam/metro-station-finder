import { expect, test } from "@playwright/test";

const routes = [
  {
    description:
      "Find metro stations and fares on Dhaka's MRT-6 network. Open source, free, and no tracking.",
    path: "/",
    title: "Metro Station Finder",
  },
  {
    description:
      "Learn about Metro Station Finder: how it works, privacy policy, data sources, licensing, and accessibility.",
    path: "/about",
    title: "About",
  },
  {
    description:
      "Find nearby metro stations on Dhaka's MRT-6 network. Get directions and distances.",
    path: "/station-finder",
    title: "Station Finder",
  },
  {
    description: "View and calculate metro fares between stations on MRT-6. Official DMTCL rates.",
    path: "/station-fares",
    title: "Station Fares",
  },
  {
    description: "Plan your MRT-6 metro trip. Get optimal routes and fare estimates.",
    path: "/trip-planner",
    title: "Trip Planner",
  },
];

test.describe("Meta tags and SEO", () => {
  for (const route of routes) {
    test(`${route.path} has correct meta tags`, async ({ page }) => {
      await page.goto(route.path);

      // Check title
      const titleElement = page.locator("title");
      expect(await titleElement.count()).toBeGreaterThan(0);
      const titleText = await titleElement.textContent();
      expect(titleText).toContain(route.title);

      // Check description meta tag
      const descriptionMeta = page.locator('meta[name="description"]');
      expect(await descriptionMeta.count()).toBe(1);
      const descriptionContent = await descriptionMeta.getAttribute("content");
      expect(descriptionContent).toBe(route.description);

      // Check canonical link
      const canonicalLink = page.locator('link[rel="canonical"]');
      expect(await canonicalLink.count()).toBe(1);
      const canonicalHref = await canonicalLink.getAttribute("href");
      expect(canonicalHref).toContain(route.path);

      // Check Open Graph tags
      const ogTitle = page.locator('meta[property="og:title"]');
      expect(await ogTitle.count()).toBe(1);
      expect(await ogTitle.getAttribute("content")).toContain(route.title);

      const ogDescription = page.locator('meta[property="og:description"]');
      expect(await ogDescription.count()).toBe(1);

      // Check Twitter Card tags
      const twitterCard = page.locator('meta[name="twitter:card"]');
      expect(await twitterCard.count()).toBe(1);
      expect(await twitterCard.getAttribute("content")).toBe("summary_large_image");

      // Check JSON-LD structured data
      const jsonLd = page.locator('script[type="application/ld+json"]');
      expect(await jsonLd.count()).toBeGreaterThan(0);

      const jsonLdText = await jsonLd.first().textContent();
      expect(jsonLdText).toBeTruthy();

      if (jsonLdText) {
        const schema = JSON.parse(jsonLdText);
        expect(schema["@context"]).toBe("https://schema.org");
        expect(schema["@type"]).toBe("WebPage");
        expect(schema.name).toBe(route.title);
        expect(schema.description).toBe(route.description);
      }
    });
  }
});

test("all routes are prerendered", async ({ page }) => {
  for (const route of routes) {
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);
  }
});
