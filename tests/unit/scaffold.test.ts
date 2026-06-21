import { describe, expect, it } from "vitest";

import pkg from "../../package.json";

describe("scaffold", () => {
  it("keeps the expected project name", () => {
    expect(pkg.name).toBe("metro-station-finder");
  });

  it("uses bun as the package manager", () => {
    expect(pkg.packageManager).toMatch(/^bun@/u);
  });

  it("declares every script the plan depends on", () => {
    const required = [
      "dev",
      "build",
      "typecheck",
      "lint",
      "lint:fix",
      "test",
      "test:unit",
      "test:integration",
      "test:e2e",
      "ci",
    ] as const;

    for (const script of required) {
      expect(pkg.scripts[script]).toBeDefined();
    }
  });
});
