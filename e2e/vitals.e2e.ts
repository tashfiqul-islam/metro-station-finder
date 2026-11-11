import { parseErrorEnvelope, parseWebVitalPayload } from "../packages/contracts/src/index.ts";
import { expect, test } from "./fixtures";
import { expectNoCoordinateInApi, installMapsStub, trackApiRequests } from "./maps-stub";

/** What each engine reports, sorted, for one click and a hide: Firefox and WebKit have no CLS (layout-shift). */
const EXPECTED = {
  chromium: ["CLS", "INP", "LCP"],
  firefox: ["INP", "LCP"],
  webkit: ["INP", "LCP"],
} as const;

test.describe("real-user web vitals beacon (METRO-44)", () => {
  test("METRO-44 the built app sends contract-valid, position-free beacons to /api/vitals and the Worker accepts them", async ({
    page,
    browserName,
  }) => {
    const apiRequests = trackApiRequests(page);
    const beacons: {
      method: string;
      type: string;
      body: string;
      url: string;
      referer: string | undefined;
    }[] = [];
    const statuses: number[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/vitals") {
        beacons.push({
          method: request.method(),
          type: request.headers()["content-type"] ?? "",
          body: request.postData() ?? "",
          url: request.url(),
          referer: request.headers()["referer"],
        });
      }
    });
    page.on("response", (response) => {
      if (new URL(response.url()).pathname === "/api/vitals") statuses.push(response.status());
    });
    await installMapsStub(page);
    // A query string on the page URL must not travel to the beacon, in the URL, the body or anywhere.
    // web-vitals is a lazy chunk loaded once the page is idle (METRO-104): wait for it, then two frames for
    // the observers to register, before the input and the simulated hide. A page already hidden when the
    // library starts would drop every earlier entry, which no real visit does.
    const chunk = page.waitForResponse((response) =>
      /\/assets\/web-vitals-[\w-]+\.js$/u.test(new URL(response.url()).pathname),
    );
    await page.goto("/?q=uttara&ref=SECRETREF");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
    ).toBeVisible();
    expect((await chunk).status()).toBe(200);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    // LCP is final at the first input, CLS and INP are reported when the page is hidden. web-vitals reports a
    // metric again on every later hide whose value changed (an unchanged value is dropped by its
    // bindReporter), so hiding repeatedly could legitimately add a second INP or CLS. Click once, wait for
    // the page to have recorded that interaction (its first-input entry, then two painted frames),
    // hide exactly once, and wait for the exact set: a missing metric or a duplicate keeps the poll red.
    await page.mouse.click(5, 5);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          // "first-input" is dispatched for the first input whatever its duration (an "event" entry is
          // dropped when the click is faster than the duration threshold), and web-vitals observes it too.
          const observer = new PerformanceObserver(() => {
            observer.disconnect();
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
          observer.observe({ type: "first-input", buffered: true });
        }),
    );
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // A beacon that is not a contract payload shows up by name, not as a poll timeout.
    const sentNames = (): string[] =>
      beacons
        .map((beacon) => {
          try {
            return parseWebVitalPayload(JSON.parse(beacon.body)).name;
          } catch {
            return "NOT-A-CONTRACT-PAYLOAD";
          }
        })
        .toSorted();
    const expectedNames = [...EXPECTED[browserName]];
    await expect.poll(sentNames, { message: "the expected beacons" }).toEqual(expectedNames);
    // Both counts are read live on every poll: a snapshot of the sent count goes stale when a beacon is
    // still in flight (METRO-135). The set is settled once every sent beacon has a response.
    await expect
      .poll(() => statuses.length === beacons.length, { message: "every beacon answered" })
      .toBe(true);
    // No airtight "nothing more will be sent" signal exists: web-vitals exposes none. What this proves is
    // that two painted frames after the answers, with the page hidden once, the set is still exactly the
    // expected one and every beacon is still answered.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    expect(sentNames()).toEqual(expectedNames);
    expect(statuses).toEqual(beacons.map(() => 204));

    for (const beacon of beacons) {
      expect(beacon.method).toBe("POST");
      expect(new URL(beacon.url).search).toBe("");
      // The page URL (with its query string) must not travel in the Referer header either.
      expect(beacon.referer).toBeUndefined();
      expect(beacon.type).toContain("application/json");
      const parsed = parseWebVitalPayload(JSON.parse(beacon.body));
      expect(Object.keys(parsed).toSorted()).toEqual([
        "id",
        "name",
        "navigationType",
        "rating",
        "value",
      ]);
      // web-vitals 6 ids are v6-<13-digit ms timestamp>-<13-digit random>: nothing else can ride in the id.
      expect(parsed.id).toMatch(/^v6-\d{13}-\d{13}$/u);
      for (const fragment of ["lat", "lng", "uttara", "SECRETREF", "?", "http"]) {
        expect(beacon.body, fragment).not.toContain(fragment);
      }
    }
    // Control: a same-origin request with the default referrer policy DOES show the Referer in this harness,
    // so the absence asserted above is not vacuous.
    await page.route("**/api/referer-control", (route) =>
      route.fulfill({ status: 200, body: "{}" }),
    );
    const [control] = await Promise.all([
      page.waitForRequest("**/api/referer-control"),
      page.evaluate(() => fetch("/api/referer-control").then((response) => response.status)),
    ]);
    expect(control.headers()["referer"]).toContain("SECRETREF");
    expect(apiRequests.some((request) => request.url.endsWith("/api/vitals"))).toBe(true);
    await expectNoCoordinateInApi(page, apiRequests);
  });

  test("METRO-44 the Worker rejects a non-contract beacon with the fixed envelope and a wrong method with 405", async ({
    request,
  }) => {
    const rejected = await request.post("/api/vitals", {
      data: {
        name: "LCP",
        value: 1,
        rating: "good",
        navigationType: "navigate",
        id: "abcdef",
        lat: 23.87,
      },
    });
    expect(rejected.status()).toBe(400);
    expect(parseErrorEnvelope(await rejected.json()).error.code).toBe("invalid_payload");
    const wrongMethod = await request.get("/api/vitals");
    expect(wrongMethod.status()).toBe(405);
    expect(wrongMethod.headers()["allow"]).toBe("POST");
    expect(parseErrorEnvelope(await wrongMethod.json()).error.code).toBe("method_not_allowed");
  });
});
