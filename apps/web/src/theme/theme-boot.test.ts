import { runInNewContext } from "node:vm";

import { expect, test } from "vitest";

import pageSource from "../../index.html?raw";
import source from "../../public/theme-boot.js?raw";
import { THEME_KEY, applyPreference, syncThemeColor } from "./theme";
import type { ThemePreference } from "./theme";

/** A stand-in for <html> that records attribute changes, so the shipped file runs against nothing else. */
function fakeRoot(initial: string | null) {
  const attributes = new Map<string, string>();
  if (initial !== null) attributes.set("data-theme", initial);
  return {
    attributes,
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    removeAttribute: (name: string) => void attributes.delete(name),
  };
}

/** Runs the shipped file once in a sandbox that has only `document` and the given `localStorage`. */
function boot(storage: { getItem: (key: string) => string | null }, before: string | null = null) {
  const root = fakeRoot(before);
  runInNewContext(source, {
    document: { documentElement: root, querySelector: () => null, querySelectorAll: () => [] },
    localStorage: storage,
  });
  return root.attributes.get("data-theme") ?? null;
}

const saved = (value: string | null) => ({
  getItem: (key: string) => (key === THEME_KEY ? value : "wrong key"),
});

test("METRO-105 the boot script reads the same key the theme store writes", () => {
  expect(source).toContain(`"${THEME_KEY}"`);
});

test("METRO-105 a saved dark or light theme is on <html> after the script runs", () => {
  expect(boot(saved("dark"))).toBe("dark");
  expect(boot(saved("light"))).toBe("light");
  expect(boot(saved("light"), "dark")).toBe("light");
});

test("METRO-105 System, a stray value and no value leave no data-theme so the OS decides", () => {
  for (const value of ["system", "purple", "", "Dark", null]) {
    expect(boot(saved(value), "dark"), String(value)).toBeNull();
  }
});

test("METRO-105 blocked storage does not throw and follows the OS", () => {
  const blocked = {
    getItem: (): string => {
      throw new DOMException("blocked", "SecurityError");
    },
  };
  expect(boot(blocked, "dark")).toBeNull();
});

test("METRO-105 the script is a plain classic script: no import, no inline-only API, no network", () => {
  expect(source).not.toMatch(
    /\bimport\b|\bexport\b|fetch\(|XMLHttpRequest|eval\(|document\.write/u,
  );
});

const LIGHT = "#aaaaaa";
const DARK = "#111111";

/** The two tags index.html ships, in a real document, so the shipped file runs against real attributes. */
function pageWithTags(): Document {
  const doc = document.implementation.createHTMLDocument("t");
  for (const [content, scheme] of [
    [LIGHT, "light"],
    [DARK, "dark"],
  ] as const) {
    const tag = doc.createElement("meta");
    tag.name = "theme-color";
    tag.content = content;
    tag.setAttribute("media", `(prefers-color-scheme: ${scheme})`);
    tag.dataset["scheme"] = scheme;
    tag.dataset["system"] = content;
    doc.head.append(tag);
  }
  return doc;
}

function colours(doc: Document): string[] {
  return [...doc.querySelectorAll<HTMLMetaElement>("meta[name=theme-color]")].map((t) => t.content);
}

test("METRO-119 a saved Dark or Light gives both theme-color tags that theme's colour", () => {
  for (const [value, expected] of [
    ["dark", DARK],
    ["light", LIGHT],
  ] as const) {
    const doc = pageWithTags();
    runInNewContext(source, { document: doc, localStorage: saved(value) });
    expect(colours(doc), value).toEqual([expected, expected]);
  }
});

test("METRO-119 System, a stray value and blocked storage leave each tag its own colour", () => {
  const blocked = {
    getItem: (): string => {
      throw new DOMException("blocked", "SecurityError");
    },
  };
  for (const storage of [saved("system"), saved("purple"), saved(null), blocked]) {
    const doc = pageWithTags();
    runInNewContext(source, { document: doc, localStorage: storage });
    expect(colours(doc)).toEqual([LIGHT, DARK]);
  }
});

test("METRO-119 the boot script and syncThemeColor give the same tags for every preference", () => {
  for (const value of ["system", "light", "dark"] as const) {
    const byScript = pageWithTags();
    runInNewContext(source, { document: byScript, localStorage: saved(value) });
    const byFunction = pageWithTags();
    syncThemeColor(value, byFunction);
    expect(colours(byFunction), value).toEqual(colours(byScript));
  }
});

/** The real head of apps/web/index.html, parsed fresh: the tests below run the shipped tags, not a copy. */
const realPage = (): Document => new DOMParser().parseFromString(pageSource, "text/html");

const tagsOf = (doc: Document): HTMLMetaElement[] => [
  ...doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
];

/** What a browser uses on an OS set to `os`: the first tag whose media query names that scheme. */
const effectiveOn = (doc: Document, os: "light" | "dark"): string | undefined =>
  tagsOf(doc).find((tag) => (tag.getAttribute("media") ?? "").includes(os))?.content;

const PAGE = { light: effectiveOn(realPage(), "light"), dark: effectiveOn(realPage(), "dark") };

test("METRO-119 index.html ships two different theme colours, one per scheme", () => {
  expect(tagsOf(realPage())).toHaveLength(2);
  expect(PAGE.light).toMatch(/^#[0-9A-F]{6}$/u);
  expect(PAGE.dark).toMatch(/^#[0-9A-F]{6}$/u);
  expect(PAGE.light).not.toBe(PAGE.dark);
});

test("METRO-119 after the real boot script, pressing through Light, Dark, System on either OS gives the right colour every time", () => {
  const presses: ThemePreference[] = [
    "light",
    "dark",
    "system",
    "light",
    "dark",
    "system",
    "system",
  ];
  for (const os of ["light", "dark"] as const) {
    for (const savedBefore of [null, "light", "dark", "system"]) {
      const doc = realPage();
      runInNewContext(source, { document: doc, localStorage: saved(savedBefore) });
      for (const press of presses) {
        applyPreference(press, doc.documentElement);
        const expected = press === "system" ? PAGE[os] : PAGE[press];
        expect(
          effectiveOn(doc, os),
          `${os} OS, saved ${String(savedBefore)}, pressed ${press}`,
        ).toBe(expected);
      }
    }
  }
});

test("METRO-119 a page with one theme-color tag keeps it under boot and under every press", () => {
  for (const choice of ["light", "dark"]) {
    const doc = realPage();
    tagsOf(doc)[1]?.remove();
    const only = tagsOf(doc)[0];
    runInNewContext(source, { document: doc, localStorage: saved(choice) });
    expect(only?.content, `boot ${choice}`).toBe(PAGE.light);
    for (const press of ["light", "dark", "system"] as const) {
      applyPreference(press, doc.documentElement);
      expect(only?.content, `press ${press}`).toBe(PAGE.light);
    }
  }
});
