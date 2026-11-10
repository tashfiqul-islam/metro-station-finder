import type { Locator, Page } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { installMapsStub, searchForPlace } from "./maps-stub";

/**
 * METRO-115: the map works on a phone. The frame spans the screen width and ends where the sheet starts, so the
 * fit view uses the area the sheet leaves; labels and pins keep their size on screen at any zoom; the four
 * invented grey blocks are gone; Windows contrast themes keep the line and the selected station visible.
 * Everything runs against the built app with the stubbed Maps API: no Google request leaves the machine.
 */
const MAP_NAME = "Schematic map of MRT Line 6";
const SIZES = [
  { name: "320 px", width: 320, height: 640 },
  { name: "390 px", width: 390, height: 844 },
] as const;

async function open(page: Page, size: { width: number; height: number }): Promise<Locator> {
  await page.setViewportSize(size);
  await installMapsStub(page);
  await page.goto("/");
  const map = page.getByRole("application", { name: MAP_NAME, exact: true });
  await expect(map).toBeVisible();
  return map;
}

/** The on-screen height, in CSS pixels, of the font of the first element matching `selector`. */
async function screenFontPx(page: Page, selector: string): Promise<number> {
  return page
    .locator(selector)
    .first()
    .evaluate((node) => {
      if (!(node instanceof SVGTextElement)) throw new Error("not text");
      const matrix = node.getScreenCTM();
      if (matrix === null) throw new Error("no layout");
      return Number.parseFloat(node.getAttribute("font-size") ?? "0") * matrix.a;
    });
}

const snapButton = (page: Page) => page.locator(".panel__grip");

async function setSnap(page: Page, snap: "peek" | "half" | "full"): Promise<void> {
  const app = page.locator(".app");
  for (let press = 0; press < 3; press += 1) {
    if ((await app.getAttribute("data-snap")) === snap) return;
    await snapButton(page).click();
  }
  await expect(app).toHaveAttribute("data-snap", snap);
}

for (const size of SIZES) {
  test.describe(`phone map at ${size.name}`, () => {
    test(`METRO-115 the map spans the screen width, nothing scrolls sideways and the labels are ${size.name} readable`, async ({
      page,
    }) => {
      const map = await open(page, size);
      const box = await map.boundingBox();
      expect(box?.x).toBe(0);
      expect(box?.width).toBe(size.width);
      const scroll = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(scroll).toEqual({ page: 0, body: 0 });
      // The end stations are named at the fit view, at their fixed size (12.5 px), whatever the sheet height.
      expect(await screenFontPx(page, "svg.map .map__pill-text")).toBeCloseTo(12.5, 1);
      await expect(page.locator("svg.map text.map__label")).toHaveCount(0);
      // One zoom step names every station at 11.5 px.
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      // Every station is named from here, except one whose label would overlap another (labels.ts).
      await expect.poll(() => page.locator("svg.map text.map__label").count()).toBeGreaterThan(8);
      expect(await screenFontPx(page, "svg.map text.map__label")).toBeCloseTo(11.5, 1);
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      expect(await screenFontPx(page, "svg.map text.map__label")).toBeCloseTo(11.5, 1);
    });

    test(`METRO-115 the fit area follows the sheet at ${size.name}: peek, half and full`, async ({
      page,
    }) => {
      const map = await open(page, size);
      const gap = (): Promise<number> =>
        page.evaluate(() => {
          const frame = document.querySelector("svg.map")?.getBoundingClientRect();
          const panel = document.querySelector("main.panel")?.getBoundingClientRect();
          return Math.round((panel?.top ?? 0) - (frame?.bottom ?? 0));
        });
      const heights: number[] = [];
      for (const snap of ["peek", "half"] as const) {
        await setSnap(page, snap);
        // The sheet animates; the frame already ends 8 px above where the sheet is going. Wait for the sheet
        // to reach it (an observable position), then compare.
        await expect.poll(gap).toBe(8);
        const frame = await map.boundingBox();
        const line = await page.locator("svg.map polyline.map__line").boundingBox();
        if (frame === null || line === null) throw new Error("no layout");
        // The whole line is inside the visible area above the sheet.
        expect(line.y).toBeGreaterThanOrEqual(frame.y - 1);
        expect(line.y + line.height).toBeLessThanOrEqual(frame.y + frame.height + 1);
        heights.push(line.height);
      }
      // A taller visible area draws a taller line: peek > half.
      expect(heights[0]).toBeGreaterThan(heights[1] ?? Infinity);
      // A full sheet covers the map: the frame has no height left, and the map does not draw past the sheet's edge.
      await setSnap(page, "full");
      await expect
        .poll(() => page.locator("svg.map").evaluate((node) => node.getBoundingClientRect().height))
        .toBe(0);
    });
  });
}

test.describe("desktop map", () => {
  test("METRO-115 at 1280 px the labels keep their size, nothing scrolls sideways and the planes are gone", async ({
    page,
  }) => {
    const map = await open(page, { width: 1280, height: 800 });
    expect(await screenFontPx(page, "svg.map .map__pill-text")).toBeCloseTo(12.5, 1);
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    expect(await screenFontPx(page, "svg.map text.map__label")).toBeCloseTo(11.5, 1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBe(0);
    await expect(map.locator("rect[class*=plane]")).toHaveCount(0);
  });
});

async function pick(page: Page, name: string): Promise<void> {
  const box = page.getByRole("combobox", { name: "Or pick a station" });
  await box.fill(name);
  await box.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
}

/**
 * True once the map has laid out for its current frame: the frame ends 8 px above the sheet and the pin groups
 * carry the scale of the frame's size (what the ResizeObserver reported), so nothing is read from a stale layout.
 */
const laidOut = (page: Page) =>
  page.evaluate(() => {
    const svg = document.querySelector("svg.map");
    const pin = document.querySelector("svg.map circle.map__pin")?.parentElement;
    const panel = document.querySelector("main.panel")?.getBoundingClientRect();
    if (!svg || !pin || !panel) return false;
    const box = svg.getBoundingClientRect();
    if (box.height <= 0) return false;
    const expected = 1 / Math.min(box.width / 470, box.height / 880);
    const got = Number(/scale\(([\d.]+)\)/u.exec(pin.getAttribute("transform") ?? "")?.[1]);
    return Math.round(panel.top - box.bottom) === 8 && Math.abs(got / expected - 1) < 0.01;
  });

/** Every pill of the map in screen pixels. */
const pillBoxes = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("svg.map rect.map__pill")].map((node) => {
      const r = node.getBoundingClientRect();
      const text = node.parentElement?.querySelector("text")?.textContent ?? "";
      return { text, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }),
  );

for (const size of SIZES) {
  test(`METRO-115 at ${size.name} the selected station is named, the other stations are not, and no two pills overlap`, async ({
    page,
  }) => {
    await open(page, size);
    await pick(page, "Karwan Bazar");
    for (const snap of ["peek", "half"] as const) {
      await setSnap(page, snap);
      await expect.poll(() => laidOut(page)).toBe(true);
      await expect.poll(async () => (await pillBoxes(page)).length).toBeGreaterThanOrEqual(2);
      // At the fit view: the two ends and the selected station are named; no other station is.
      const names = (await pillBoxes(page)).map((box) => box.text);
      expect(names).toContain("Karwan Bazar");
      expect(
        names.every((name) => ["Uttara North", "Karwan Bazar", "Motijheel"].includes(name)),
      ).toBe(true);
      await expect(page.locator("svg.map text.map__label")).toHaveCount(0);
    }
  });

  for (const near of ["Bangladesh Secretariat", "Pallabi", "Dhaka University"]) {
    test(`METRO-115 at ${size.name} a selected ${near} next to an end station does not overlap its pill`, async ({
      page,
    }) => {
      await open(page, size);
      await pick(page, near);
      for (const snap of ["peek", "half"] as const) {
        await setSnap(page, snap);
        await expect.poll(() => laidOut(page)).toBe(true);
        await expect
          .poll(async () => (await pillBoxes(page)).map((box) => box.text))
          .toContain(near);
        const boxes = await pillBoxes(page);
        for (const [index, a] of boxes.entries()) {
          for (const b of boxes.slice(index + 1)) {
            const apart =
              a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
            expect(apart, `${a.text} and ${b.text} at ${snap}`).toBe(true);
          }
        }
      }
    });
  }

  test(`METRO-115 at ${size.name} a full sheet makes the map inert, and leaving full brings it back`, async ({
    page,
  }) => {
    const map = await open(page, size);
    const zoom = page.getByRole("button", { name: "Zoom in", exact: true });
    await expect(zoom).toBeVisible();
    await setSnap(page, "full");
    // Hidden, not just covered: no tab stop, no button, nothing for a screen reader.
    await expect(map).toBeHidden();
    await expect(zoom).toBeHidden();
    for (let press = 0; press < 14; press += 1) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.closest(".app__map") ?? null)).toBe(
        null,
      );
    }
    await setSnap(page, "half");
    await expect(map).toBeVisible();
    await expect(zoom).toBeVisible();
    await map.focus();
    await expect(map).toBeFocused();
  });

  test(`METRO-115 at ${size.name} a zoomed map keeps its view when the sheet moves, and the fit button re-fits it`, async ({
    page,
  }) => {
    const map = await open(page, size);
    await setSnap(page, "peek");
    await expect
      .poll(() => map.evaluate((node) => node.getBoundingClientRect().height))
      .toBeGreaterThan(300);
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    const zoomed = await map.getAttribute("viewBox");
    expect(zoomed).not.toBe("100 70 470 880");
    await setSnap(page, "half");
    expect(await map.getAttribute("viewBox")).toBe(zoomed);
    await page.getByRole("button", { name: "Show whole line", exact: true }).click();
    await expect(map).toHaveAttribute("viewBox", "100 70 470 880");
  });
}

test("METRO-115 a zoomed phone map paints nothing above its frame, under the header", async ({
  page,
}) => {
  const map = await open(page, { width: 390, height: 844 });
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  }
  const frame = await map.boundingBox();
  if (frame === null) throw new Error("no layout");
  const hits = await page.evaluate(
    ({ x, y }) => document.elementsFromPoint(x, y).some((node) => node.closest("svg.map") !== null),
    { x: 195, y: frame.y - 10 },
  );
  expect(hits, "the map paints above its frame").toBe(false);
  const inside = await page.evaluate(
    ({ x, y }) => document.elementsFromPoint(x, y).some((node) => node.closest("svg.map") !== null),
    { x: 195, y: frame.y + 10 },
  );
  expect(inside, "the map paints inside its frame").toBe(true);
});

for (const size of [
  { name: "390 px", width: 390, height: 844 },
  { name: "1280 px", width: 1280, height: 800 },
]) {
  test(`METRO-115 Windows contrast themes at ${size.name}: the line and the selected station use system colours and stay visible`, async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await open(page, size);
    await searchForPlace(page, "motijheel");
    await expect(page.locator("svg.map circle.map__pin--hl")).toBeVisible();
    const style = (selector: string, properties: readonly string[]) =>
      page
        .locator(selector)
        .first()
        .evaluate(
          (node, names) =>
            Object.fromEntries(
              names.map((name) => [name, getComputedStyle(node).getPropertyValue(name)]),
            ),
          properties,
        );
    const line = await style("svg.map polyline.map__line", [
      "stroke",
      "stroke-width",
      "stroke-opacity",
      "opacity",
    ]);
    const casing = await style("svg.map polyline.map__casing", ["stroke"]);
    const pin = await style("svg.map circle.map__pin--hl", ["fill", "stroke"]);
    const ground = await style("svg.map rect.map__bg", ["fill"]);
    // A plain system colour, not the token gradient (url(...)), drawn at a visible width and fully opaque.
    expect(line["stroke"]).toMatch(/^rgb/u);
    expect(Number.parseFloat(line["stroke-width"] ?? "0")).toBeGreaterThanOrEqual(4);
    expect(Number.parseFloat(line["stroke-opacity"] ?? "0")).toBe(1);
    expect(Number.parseFloat(line["opacity"] ?? "0")).toBe(1);
    expect(casing["stroke"]).toMatch(/^rgb/u);
    expect(pin["fill"]).toMatch(/^rgb/u);
    // The line differs from its casing and from the ground; the selected pin differs from the line.
    expect(line["stroke"]).not.toBe(casing["stroke"]);
    expect(line["stroke"]).not.toBe(ground["fill"]);
    expect(pin["fill"]).not.toBe(line["stroke"]);
    expect(pin["fill"]).not.toBe(ground["fill"]);
  });
}

for (const size of [
  { name: "320 px", width: 320, height: 640 },
  { name: "390 px", width: 390, height: 844 },
  { name: "1280 px", width: 1280, height: 800 },
]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`METRO-115 the map has no inline style and passes axe in ${scheme} at ${size.name}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, size);
      await pick(page, "Karwan Bazar");
      expect(await page.locator(".app__map [style]").count()).toBe(0);
      const results = await axeBuilder(page).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }
}

for (const size of SIZES) {
  test(`METRO-115 at ${size.name} Show on map from a full sheet drops the sheet and focuses the map`, async ({
    page,
  }) => {
    const map = await open(page, size);
    await pick(page, "Karwan Bazar");
    await setSnap(page, "full");
    await expect(map).toBeHidden();
    await page.getByRole("button", { name: "Show on map", exact: true }).click();
    await expect(page.locator(".app")).toHaveAttribute("data-snap", "peek");
    await expect(map).toBeVisible();
    await expect(map).toBeFocused();
  });

  test(`METRO-115 at ${size.name} focus in the map moves to the sheet grip when the sheet goes full`, async ({
    page,
  }) => {
    const map = await open(page, size);
    await setSnap(page, "half");
    await map.focus();
    await expect(map).toBeFocused();
    // A script click moves no focus: the focus is still in the map when the sheet reaches full.
    await page.locator(".panel__snap--up").evaluate((node) => {
      if (node instanceof HTMLElement) node.click();
    });
    await expect(page.locator(".app")).toHaveAttribute("data-snap", "full");
    const grip = page.locator(".panel__grip");
    await expect(grip).toBeFocused();
    await expect(grip).toBeVisible();
  });

  test(`METRO-115 at ${size.name} the focused map shows a focus ring that the clip does not cut`, async ({
    page,
  }) => {
    const map = await open(page, size);
    await map.focus();
    expect(await map.evaluate((node) => node.matches(":focus-visible"))).toBe(true);
    const ring = await map.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        width: Number.parseFloat(style.outlineWidth),
        offset: Number.parseFloat(style.outlineOffset),
        style: style.outlineStyle,
        clip: style.clipPath,
      };
    });
    expect(ring.style).toBe("solid");
    expect(ring.width).toBeGreaterThanOrEqual(2);
    // The clip starts at the border box on the top and sides: the ring must end inside it (offset + width <= 0).
    expect(ring.clip).toContain("inset(");
    expect(ring.offset + ring.width).toBeLessThanOrEqual(0);
  });
}
