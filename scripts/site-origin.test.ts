import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  OG_IMAGE_PATH,
  ORIGIN_TOKEN,
  SITE_ORIGIN,
  siteOriginPlugin,
  withSiteOrigin,
} from "./site-origin.ts";

/**
 * METRO-122: the canonical link, `og:url` and `og:image` come from one constant. `index.html` is static, so it
 * holds a token that `siteOriginPlugin` replaces; these tests read the template and the built result.
 */
const root = join(import.meta.dir, "..");
const template = readFileSync(join(root, "apps/web/index.html"), "utf8");
const built = withSiteOrigin(template);

const attribute = (html: string, tag: RegExp, name: string): string | undefined =>
  new RegExp(`${name}="([^"]*)"`, "u").exec(tag.exec(html)?.[0] ?? "")?.[1];
const canonical = (html: string) => attribute(html, /<link rel="canonical"[^>]*>/u, "href");
const meta = (html: string, property: string) =>
  attribute(html, new RegExp(`<meta\\s+(?:property|name)="${property}"[^>]*>`, "u"), "content");

describe("the site origin constant", () => {
  test("is the owner's apex over https, with no path, and the image path is the generated file", () => {
    expect(SITE_ORIGIN).toBe("https://metro-station-finder.com");
    expect(new URL(SITE_ORIGIN).origin).toBe(SITE_ORIGIN);
    expect(OG_IMAGE_PATH).toBe("/og/og-default.png");
  });

  test("withSiteOrigin replaces every token and nothing else", () => {
    expect(withSiteOrigin(`a ${ORIGIN_TOKEN}/x b ${ORIGIN_TOKEN}/`)).toBe(
      `a ${SITE_ORIGIN}/x b ${SITE_ORIGIN}/`,
    );
    expect(withSiteOrigin("no token")).toBe("no token");
  });

  test("the plugin runs first and transforms with the same function", () => {
    const plugin = siteOriginPlugin();
    expect(plugin.name).toBe("metro-site-origin");
    expect(plugin.transformIndexHtml.order).toBe("pre");
    expect(plugin.transformIndexHtml.handler(`${ORIGIN_TOKEN}/`)).toBe(`${SITE_ORIGIN}/`);
  });
});

describe("index.html share and canonical tags (METRO-122)", () => {
  test("the template writes no origin of its own: only the token, so there is one source", () => {
    expect(template).not.toMatch(/https?:\/\//u);
    expect(template).not.toContain("metro-station-finder.com");
    expect(template.match(/%SITE_ORIGIN%/gu)).toHaveLength(3);
  });

  test("canonical href, og:url and the og:image origin are identical and are the constant", () => {
    const image = new URL(meta(built, "og:image") ?? "not a url");
    expect(canonical(built)).toBe(`${SITE_ORIGIN}/`);
    expect(meta(built, "og:url")).toBe(canonical(built));
    expect(image.origin).toBe(SITE_ORIGIN);
    expect(image.origin).toBe(new URL(canonical(built) ?? "").origin);
    expect(image.origin).toBe(new URL(meta(built, "og:url") ?? "").origin);
  });

  test("og:image is an absolute https URL ending in /og/og-default.png, with no placeholder left", () => {
    expect(meta(built, "og:image")).toBe("https://metro-station-finder.com/og/og-default.png");
    expect(meta(built, "og:image")).toBe(`${SITE_ORIGIN}${OG_IMAGE_PATH}`);
    expect(new URL(meta(built, "og:image") ?? "").pathname).toBe("/og/og-default.png");
    expect(built).not.toMatch(/%[A-Z_]+%|example\.(?:com|org)|placeholder|your-domain|TODO|TBD/iu);
  });

  test("the image is declared as a 1200 x 630 PNG with the approved alt text, for Open Graph and X", () => {
    const alt =
      "Metro Station Finder logo above the headline 'Find your nearest Dhaka MRT Line 6 station' and the line 'Stations and fares work offline.', beside a 3D map where a teal-to-blue metro line crosses a tilted grid and the logo floats like a pin above the nearest station.";
    expect(meta(built, "og:image:width")).toBe("1200");
    expect(meta(built, "og:image:height")).toBe("630");
    expect(meta(built, "og:image:type")).toBe("image/png");
    expect(meta(built, "og:image:alt")).toBe(alt);
    expect(meta(built, "twitter:image:alt")).toBe(alt);
    expect(meta(built, "twitter:card")).toBe("summary_large_image");
    expect(meta(built, "og:type")).toBe("website");
    expect(meta(built, "og:title")).toBe("Metro Station Finder");
    expect(meta(built, "og:description")).toBe(meta(built, "description"));
  });

  test("the offline sentence is not repeated in the page head beyond the alt text of the image", () => {
    const head = built.replaceAll(/content="Metro Station Finder logo above[^"]*"/gu, "");
    expect(head).not.toMatch(/offline/iu);
  });
});
