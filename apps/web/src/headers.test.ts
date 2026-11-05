import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

type HeaderRules = Record<string, Record<string, string>>;

/** Minimal `_headers` reader: unindented line = URL pattern, indented `Name: value` = header. */
function parseHeadersFile(text: string): HeaderRules {
  const result: HeaderRules = {};
  let current: Record<string, string> | undefined;
  for (const raw of text.split(/\r?\n/u)) {
    if (raw.trim() === "" || raw.trimStart().startsWith("#")) continue;
    if (!/^\s/u.test(raw)) {
      current = {};
      result[raw.trim()] = current;
      continue;
    }
    if (current === undefined) throw new Error(`header before any URL: ${raw}`);
    const colon = raw.indexOf(":");
    const name = raw.slice(0, colon).trim().toLowerCase();
    if (name in current) throw new Error(`duplicate header ${name}`);
    current[name] = raw.slice(colon + 1).trim();
  }
  return result;
}

function rules(): HeaderRules {
  return parseHeadersFile(readFileSync(new URL("../public/_headers", import.meta.url), "utf8"));
}

test("METRO-31 parseHeadersFile reads url blocks with indented headers", () => {
  expect(parseHeadersFile("# c\n/a/*\n  X-A: 1\n  X-B: two: three\n\n/b\n  X-C: 3\n")).toEqual({
    "/a/*": { "x-a": "1", "x-b": "two: three" },
    "/b": { "x-c": "3" },
  });
});

test("METRO-31 parseHeadersFile rejects a header before any url and a duplicate header", () => {
  expect(() => parseHeadersFile("  X-A: 1\n")).toThrow("before any URL");
  expect(() => parseHeadersFile("/a\n  X-A: 1\n  x-a: 2\n")).toThrow("duplicate");
});

test("METRO-31 every page gets the security headers and a Report-Only CSP", () => {
  const all = rules()["/*"];
  expect(all).toBeDefined();
  expect(all?.["x-content-type-options"]).toBe("nosniff");
  expect(all?.["permissions-policy"]).toBe("geolocation=(self)");
  // Not no-referrer: the Maps browser key is referrer-restricted.
  expect(all?.["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(all?.["x-frame-options"]).toBe("DENY");
  expect(all?.["content-security-policy-report-only"]).toContain("default-src 'self'");
  expect(all?.["content-security-policy-report-only"]).toContain("object-src 'none'");
  // Enforcing CSP and HSTS are deliberately absent (ADR-0011).
  expect(all?.["content-security-policy"]).toBeUndefined();
  expect(all?.["strict-transport-security"]).toBeUndefined();
});

test("METRO-31 only hashed /assets/* is immutable; pages never set Cache-Control", () => {
  const all = rules();
  expect(all["/assets/*"]?.["cache-control"]).toBe("public, max-age=31536000, immutable");
  expect(all["/*"]?.["cache-control"]).toBeUndefined();
  expect(Object.keys(all)).toEqual(["/*", "/assets/*"]);
});
