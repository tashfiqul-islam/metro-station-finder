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
      "Learn about Metro Station Finder, the maintainer behind it, and the open-source intent shaping the product.",
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
  {
    description:
      "Log in to Metro Station Finder. Account features are planned, but the MRT tools remain open without sign-in for now.",
    path: "/login",
    title: "Log in",
  },
  {
    description:
      "Sign up for Metro Station Finder. Accounts are planned for saved preferences and future personalized MRT features.",
    path: "/signup",
    title: "Sign up",
  },
];

test.describe("Meta tags and SEO", () => {
  for (const route of routes) {
    test(`${route.path} has correct meta tags`, async ({ page }) => {
      await page.goto(route.path);

      // Check title
      await expect(page).toHaveTitle(new RegExp(route.title));

      // Check description meta tag
      const descriptionMeta = page.locator('meta[name="description"]');
      await expect(descriptionMeta).toHaveCount(1);
      const descriptionContent = await descriptionMeta.getAttribute("content");
      expect(descriptionContent).toBe(route.description);

      // Check canonical link
      const canonicalLink = page.locator('link[rel="canonical"]');
      await expect(canonicalLink).toHaveCount(1);
      const canonicalHref = await canonicalLink.getAttribute("href");
      expect(canonicalHref).toContain(route.path);

      // Check Open Graph tags
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveCount(1);
      expect(await ogTitle.getAttribute("content")).toContain(route.title);

      const ogDescription = page.locator('meta[property="og:description"]');
      await expect(ogDescription).toHaveCount(1);

      // Check Twitter Card tags
      const twitterCard = page.locator('meta[name="twitter:card"]');
      await expect(twitterCard).toHaveCount(1);
      expect(await twitterCard.getAttribute("content")).toBe("summary_large_image");

      // Check JSON-LD structured data
      const jsonLd = page.locator('script[type="application/ld+json"]');
      await expect(jsonLd).toHaveCount(1);

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
