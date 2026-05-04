import { afterEach, describe, expect, it, vi } from "vitest";

import { generateHeadConfig, generateRouteMeta, generateWebPageSchema } from "@/lib/head-meta";

describe("head-meta", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps the site title unchanged when title matches the site name", async () => {
    const { generateRouteMeta: generateRouteMetaFromModule } = await import("@/lib/head-meta");
    const meta = generateRouteMetaFromModule({
      description: "Desc",
      path: "/",
      title: "Metro Station Finder",
    });

    expect(meta.meta).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Metro Station Finder" })]),
    );
  });

  it("keeps absolute image URLs unchanged", () => {
    const meta = generateRouteMeta({
      description: "Desc",
      image: "https://cdn.example.com/og.png",
      path: "/x",
      title: "X",
    });

    expect(meta.meta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: "https://cdn.example.com/og.png",
          property: "og:image",
        }),
      ]),
    );
  });

  it("generates head config with a JSON-LD script", () => {
    const head = generateHeadConfig({
      description: "Desc",
      path: "/x",
      title: "X",
    });

    expect(head.scripts).toHaveLength(1);
    expect(head.scripts?.[0]).toEqual(expect.objectContaining({ type: "application/ld+json" }));
  });

  it("generates webpage schema with site relationship", () => {
    const schema = generateWebPageSchema({
      description: "Desc",
      path: "/x",
      title: "X",
    });

    const script = schema.scripts?.[0];
    if (!script || typeof script.children !== "string") {
      throw new Error("Missing JSON-LD payload");
    }

    const payload = JSON.parse(script.children) as { isPartOf?: Record<string, unknown> };

    expect(payload.isPartOf).toEqual(
      expect.objectContaining({ "@type": "WebSite", name: "Metro Station Finder" }),
    );
  });

  it("adds twitter:creator when the optional handle is configured", async () => {
    vi.stubEnv("VITE_TWITTER_HANDLE", "@metrofinder");
    const { generateRouteMeta: generateRouteMetaFromModule } = await import("@/lib/head-meta");

    const meta = generateRouteMetaFromModule({
      description: "Desc",
      path: "/x",
      title: "X",
    });

    expect(meta.meta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ content: "@metrofinder", name: "twitter:creator" }),
      ]),
    );
  });
});
