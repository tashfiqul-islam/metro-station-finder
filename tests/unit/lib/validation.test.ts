import { describe, expect, it } from "vitest";

import { clampLatitude, clampLongitude, isSlug, parseOrThrow } from "@/lib/validation";
import * as v from "valibot";

describe("isSlug", () => {
  it("accepts valid kebab-case slugs", () => {
    expect(isSlug("uttara-north")).toBe(true);
    expect(isSlug("mirpur-10")).toBe(true);
    expect(isSlug("karwan-bazar")).toBe(true);
    expect(isSlug("shahbagh")).toBe(true);
  });

  it("rejects slugs with underscores", () => {
    expect(isSlug("uttara_north")).toBe(false);
  });

  it("rejects slugs with uppercase letters", () => {
    expect(isSlug("Uttara-North")).toBe(false);
  });

  it("rejects slugs with trailing or leading hyphens", () => {
    expect(isSlug("-uttara")).toBe(false);
    expect(isSlug("uttara-")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isSlug("")).toBe(false);
  });
});

describe("clampLatitude", () => {
  it("returns value unchanged when in range", () => {
    expect(clampLatitude(23.87)).toBe(23.87);
    expect(clampLatitude(0)).toBe(0);
  });

  it("clamps values above 90 to 90", () => {
    expect(clampLatitude(100)).toBe(90);
  });

  it("clamps values below -90 to -90", () => {
    expect(clampLatitude(-100)).toBe(-90);
  });
});

describe("clampLongitude", () => {
  it("returns value unchanged when in range", () => {
    expect(clampLongitude(90.37)).toBe(90.37);
    expect(clampLongitude(0)).toBe(0);
  });

  it("clamps values above 180 to 180", () => {
    expect(clampLongitude(200)).toBe(180);
  });

  it("clamps values below -180 to -180", () => {
    expect(clampLongitude(-200)).toBe(-180);
  });
});

describe("parseOrThrow", () => {
  const schema = v.pipe(v.number(), v.minValue(0, "Must be non-negative"));

  it("returns parsed value on success", () => {
    expect(parseOrThrow(schema, 42)).toBe(42);
  });

  it("throws ValiError on failure", () => {
    expect(() => parseOrThrow(schema, -1)).toThrow();
  });
});
