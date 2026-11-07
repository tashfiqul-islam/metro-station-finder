import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "vitest";

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
  return parseHeadersFile(readFileSync(join(import.meta.dirname, "../public/_headers"), "utf8"));
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

/** Directive name to its source list, from a CSP header value. */
function directives(policy: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const part of policy.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/u);
    if (name) result[name] = sources;
  }
  return result;
}

test("METRO-88 directives reads a CSP header into directive and sources", () => {
  expect(directives("default-src 'self'; img-src 'self' data:; object-src 'none'")).toEqual({
    "default-src": ["'self'"],
    "img-src": ["'self'", "data:"],
    "object-src": ["'none'"],
  });
  expect(directives("")).toEqual({});
});

test("METRO-31 every page gets the security headers", () => {
  const all = rules()["/*"];
  expect(all).toBeDefined();
  expect(all?.["x-content-type-options"]).toBe("nosniff");
  expect(all?.["permissions-policy"]).toBe("geolocation=(self)");
  // Not no-referrer: the Maps browser key is referrer-restricted.
  expect(all?.["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(all?.["x-frame-options"]).toBe("DENY");
  // HSTS is deliberately absent until the custom domain (ADR-0011).
  expect(all?.["strict-transport-security"]).toBeUndefined();
});

test("METRO-88 the CSP is enforced, not Report-Only", () => {
  const all = rules()["/*"];
  expect(all?.["content-security-policy"]).toBeDefined();
  expect(all?.["content-security-policy-report-only"]).toBeUndefined();
});

test("METRO-88 the CSP allows exactly the justified Google hosts and nothing broader", () => {
  const csp = directives(rules()["/*"]?.["content-security-policy"] ?? "");
  expect(csp).toEqual({
    "default-src": ["'self'"],
    "script-src": ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
    "style-src": ["'self'"],
    "img-src": ["'self'", "data:", "https://maps.gstatic.com", "https://maps.googleapis.com"],
    "connect-src": [
      "'self'",
      "https://maps.googleapis.com",
      "https://places.googleapis.com",
      "https://routes.googleapis.com",
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  });
  // Each of these needs a justification from the live check (ADR-0011 amendment) before it is added.
  const text = Object.values(csp).flat().join(" ");
  for (const banned of ["'unsafe-eval'", "'unsafe-inline'", "blob:", "*", "http:", "https:"]) {
    expect(text.split(" ")).not.toContain(banned);
  }
  expect(text).not.toContain("*.");
});

test("METRO-31 only hashed /assets/* is immutable; pages never set Cache-Control", () => {
  const all = rules();
  expect(all["/assets/*"]?.["cache-control"]).toBe("public, max-age=31536000, immutable");
  expect(all["/*"]?.["cache-control"]).toBeUndefined();
  expect(Object.keys(all)).toEqual(["/*", "/assets/*"]);
});
