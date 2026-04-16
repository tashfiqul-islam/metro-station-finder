import { describe, expect, it } from "vitest";

import { TECH_LOGOS } from "@/pages/home/sections/tech-stack-section";

describe("TechStackSection — techLogos array", () => {
  it("does not contain Google Maps", () => {
    const names = TECH_LOGOS.map((t) => t.name);
    expect(names).not.toContain("Google Maps");
  });

  it("does not contain Zod", () => {
    const names = TECH_LOGOS.map((t) => t.name);
    expect(names).not.toContain("Zod");
  });

  it("includes MapLibre", () => {
    const names = TECH_LOGOS.map((t) => t.name);
    expect(names).toContain("MapLibre");
  });

  it("includes Valibot", () => {
    const names = TECH_LOGOS.map((t) => t.name);
    expect(names).toContain("Valibot");
  });

  it("includes mapcn", () => {
    const names = TECH_LOGOS.map((t) => t.name);
    expect(names).toContain("mapcn");
  });
});
